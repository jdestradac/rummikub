import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServiceRoleClient } from '@/db/server';
import { applyAction, toPublicGameState } from '@/core/gameEngine';
import { runGameAction } from '../_shared';
import { maybeTriggerBotTurn } from '../_botRunner';

const actionSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('PLACE_TILE'),
    tileId: z.string().min(1),
    groupId: z.string().min(1),
    position: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('MOVE_TILE'),
    tileId: z.string().min(1),
    fromGroupId: z.string().min(1),
    toGroupId: z.string().min(1),
    position: z.number().int().min(0),
  }),
  z.object({
    type: z.literal('CREATE_GROUP'),
    tileIds: z.array(z.string().min(1)).min(1),
  }),
  z.object({
    type: z.literal('SPLIT_GROUP'),
    groupId: z.string().min(1),
    splitAt: z.number().int().min(1),
  }),
  z.object({ type: z.literal('CONFIRM_TURN') }),
  z.object({ type: z.literal('UNDO_TURN') }),
  z.object({ type: z.literal('DRAW_TILE') }),
]);

const bodySchema = z.object({
  roomId: z.string().uuid(),
  playerId: z.string().uuid(),
  action: actionSchema,
});

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Solicitud inválida.' }, { status: 400 });
    }
    const { roomId, playerId, action } = parsed.data;

    const supabase = getSupabaseServiceRoleClient();
    const outcome = await runGameAction(supabase, roomId, playerId, (state) => applyAction(state, action, playerId));

    if (!outcome.ok) {
      return NextResponse.json({ error: outcome.error }, { status: outcome.status });
    }

    await maybeTriggerBotTurn(supabase, roomId);

    return NextResponse.json({
      success: outcome.result.success,
      error: outcome.result.error,
      publicState: toPublicGameState(outcome.result.newState),
      myRack: outcome.myRack,
    });
  } catch (err) {
    console.error('POST /api/game/action failed:', err);
    return NextResponse.json({ error: 'No se pudo procesar la acción.' }, { status: 500 });
  }
}
