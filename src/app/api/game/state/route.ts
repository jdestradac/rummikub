import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServerClient, getSupabaseServiceRoleClient } from '@/db/server';
import { fetchServerGameState } from '@/db/queries/gameState';
import { getPlayerById } from '@/db/queries/players';
import { toPublicGameState } from '@/core/gameEngine';

const querySchema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
});

/**
 * Initial hydration for a client that just mounted the game view (fresh
 * load or reconnect mid-game). Realtime broadcasts only reach clients that
 * were already subscribed when they fired, so this fills the gap.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = querySchema.safeParse({
      roomId: searchParams.get('roomId'),
      playerId: searchParams.get('playerId'),
    });
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
    }
    const { roomId, playerId } = parsed.data;

    const authClient = getSupabaseServerClient();
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

    const supabase = getSupabaseServiceRoleClient();
    const player = await getPlayerById(supabase, playerId);
    if (!player || player.room_id !== roomId || player.user_id !== user.id) {
      return NextResponse.json({ error: 'You are not a member of this game.' }, { status: 403 });
    }

    const loaded = await fetchServerGameState(supabase, roomId);
    if (!loaded) return NextResponse.json({ error: 'Game has not started yet.' }, { status: 404 });

    return NextResponse.json({
      publicState: toPublicGameState(loaded.state),
      myRack: loaded.state.racks[playerId] ?? [],
    });
  } catch (err) {
    console.error('GET /api/game/state failed:', err);
    return NextResponse.json({ error: 'Failed to load game state.' }, { status: 500 });
  }
}
