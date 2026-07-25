import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/db/server';
import { createRoom } from '@/db/queries/rooms';
import { addHumanPlayer, addBotPlayer, BOT_NAMES } from '@/db/queries/players';
import { MAX_BOTS, MAX_PLAYERS, MIN_PLAYERS } from '@/lib/constants';

const bodySchema = z.object({
  name: z.string().trim().min(1).max(24),
  maxPlayers: z.number().int().min(MIN_PLAYERS).max(MAX_PLAYERS),
  botCount: z.number().int().min(0).max(MAX_BOTS),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
    }
    const { name, maxPlayers, botCount } = parsed.data;

    if (botCount > maxPlayers - 1) {
      return NextResponse.json({ error: 'Too many bots for the selected player count.' }, { status: 400 });
    }

    const authClient = getSupabaseServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: 'No authenticated session. Reload the page and try again.' },
        { status: 401 },
      );
    }

    const supabase = getSupabaseServiceRoleClient();
    const room = await createRoom(supabase, { hostId: user.id, maxPlayers, botCount });
    const hostPlayer = await addHumanPlayer(supabase, { roomId: room.id, userId: user.id, name });

    for (let i = 0; i < botCount; i++) {
      await addBotPlayer(supabase, room.id, BOT_NAMES[i] ?? `Bot ${i + 1}`);
    }

    return NextResponse.json({
      roomId: room.id,
      roomCode: room.code,
      playerId: hostPlayer.id,
      userId: user.id,
    });
  } catch (err) {
    console.error('POST /api/rooms failed:', err);
    return NextResponse.json({ error: 'Failed to create room.' }, { status: 500 });
  }
}
