import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServiceRoleClient } from '@/db/server';
import { getRoomById, updateRoomStatus } from '@/db/queries/rooms';
import { getPlayerById, getPlayersByRoom } from '@/db/queries/players';
import { upsertGameState, syncPlayersFromState, insertGameEvent } from '@/db/queries/gameState';
import { broadcastGameEvent } from '@/db/realtime';
import { initializeGame, toPublicGameState, type NewPlayerInput } from '@/core/gameEngine';
import { MIN_PLAYERS } from '@/lib/constants';
import { maybeTriggerBotTurn } from '../_botRunner';

const bodySchema = z.object({
  roomId: z.string().uuid(),
  hostPlayerId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
    }
    const { roomId, hostPlayerId } = parsed.data;

    const supabase = getSupabaseServiceRoleClient();

    const room = await getRoomById(supabase, roomId);
    if (!room) return NextResponse.json({ error: 'Room not found.' }, { status: 404 });

    const hostPlayer = await getPlayerById(supabase, hostPlayerId);
    if (!hostPlayer || hostPlayer.room_id !== roomId || hostPlayer.user_id !== room.host_id) {
      return NextResponse.json({ error: 'Only the host can start the game.' }, { status: 403 });
    }

    const players = await getPlayersByRoom(supabase, roomId);
    if (players.length < MIN_PLAYERS) {
      return NextResponse.json({ error: `Need at least ${MIN_PLAYERS} players to start.` }, { status: 400 });
    }

    const inputs: NewPlayerInput[] = players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.is_bot,
      seat: p.seat,
    }));

    const state = initializeGame(roomId, inputs);

    await upsertGameState(supabase, state);
    await syncPlayersFromState(supabase, state);
    await updateRoomStatus(supabase, roomId, 'playing');
    await insertGameEvent(supabase, { roomId, playerId: null, eventType: 'game_started' });

    const publicState = toPublicGameState(state);
    await broadcastGameEvent(supabase, roomId, { event: 'game:started', payload: publicState });

    await maybeTriggerBotTurn(supabase, roomId);

    return NextResponse.json({ success: true, publicState });
  } catch (err) {
    console.error('POST /api/game/start failed:', err);
    return NextResponse.json({ error: 'Failed to start the game.' }, { status: 500 });
  }
}
