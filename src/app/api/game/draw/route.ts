import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServiceRoleClient } from '@/db/server';
import { applyAction, toPublicGameState } from '@/core/gameEngine';
import { runGameAction } from '../_shared';
import { maybeTriggerBotTurn } from '../_botRunner';

const bodySchema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Solicitud inválida.' }, { status: 400 });
    }
    const { roomId, playerId } = parsed.data;

    const supabase = getSupabaseServiceRoleClient();
    const outcome = await runGameAction(supabase, roomId, playerId, (state) =>
      applyAction(state, { type: 'DRAW_TILE' }, playerId),
    );

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    if (outcome.result.success) {
      await maybeTriggerBotTurn(supabase, roomId);
    }

    return NextResponse.json({
      success: outcome.result.success,
      error: outcome.result.error,
      publicState: toPublicGameState(outcome.result.newState),
      myRack: outcome.myRack,
    });
  } catch (err) {
    console.error('POST /api/game/draw failed:', err);
    return NextResponse.json({ error: 'No se pudo robar una ficha.' }, { status: 500 });
  }
}
