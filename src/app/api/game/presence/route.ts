import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServiceRoleClient } from '@/db/server';
import { setPlayerConnection } from '@/db/queries/players';

const bodySchema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
  isConnected: z.boolean(),
});

/** Mirrors Supabase Realtime presence join/leave into the `players` table. */
export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Invalid request.' }, { status: 400 });
    }

    const supabase = getSupabaseServiceRoleClient();
    await setPlayerConnection(supabase, parsed.data.playerId, parsed.data.isConnected);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('POST /api/game/presence failed:', err);
    return NextResponse.json({ error: 'Failed to update presence.' }, { status: 500 });
  }
}
