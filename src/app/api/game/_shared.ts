import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import type { ActionResult, ServerGameState, Tile } from '@/core/types';
import { fetchServerGameState, saveGameState, syncPlayersFromState, insertGameEvent } from '@/db/queries/gameState';
import { updateRoomStatus } from '@/db/queries/rooms';
import { toPublicGameState } from '@/core/gameEngine';
import { calculateFinalScores } from '@/core/scoring';
import { broadcastGameEvent } from '@/db/realtime';

const MAX_RETRIES = 5;

export type RunGameActionOutcome =
  | { ok: true; result: ActionResult; myRack: Tile[] }
  | { ok: false; error: string; status: number };

/**
 * Loads the current game state, applies `actionFn` to it, and persists the
 * result using optimistic concurrency (retrying if another request wrote to
 * the row in between). Also fans out the standard side effects: syncing the
 * `players` table, logging the event, and broadcasting the update.
 */
export async function runGameAction(
  supabase: SupabaseClient<Database>,
  roomId: string,
  playerId: string,
  actionFn: (state: ServerGameState) => ActionResult,
): Promise<RunGameActionOutcome> {
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    const loaded = await fetchServerGameState(supabase, roomId);
    if (!loaded) return { ok: false, error: 'Partida no encontrada.', status: 404 };

    const result = actionFn(loaded.state);
    const saved = await saveGameState(supabase, result.newState, loaded.updatedAt);
    if (!saved) continue; // row changed concurrently - retry from a fresh read

    await syncPlayersFromState(supabase, result.newState);

    if (result.event) {
      await insertGameEvent(supabase, {
        roomId,
        playerId: result.event.playerId,
        eventType: result.event.eventType,
      });
      await broadcastGameEvent(supabase, roomId, {
        event: 'game:log',
        payload: {
          ...result.event,
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          timestamp: new Date().toISOString(),
        },
      });
    }

    if (result.newState.phase === 'finished' && result.newState.winnerId) {
      await updateRoomStatus(supabase, roomId, 'finished');
      const finalScores = calculateFinalScores(
        result.newState.players.map((p) => ({ id: p.id, name: p.name, rack: result.newState.racks[p.id] ?? [] })),
        result.newState.winnerId,
      );
      await broadcastGameEvent(supabase, roomId, {
        event: 'game:finished',
        payload: { winnerId: result.newState.winnerId, finalScores },
      });
    } else {
      await broadcastGameEvent(supabase, roomId, {
        event: 'state:updated',
        payload: toPublicGameState(result.newState),
      });
    }

    return { ok: true, result, myRack: result.newState.racks[playerId] ?? [] };
  }

  return { ok: false, error: 'No se pudo guardar la jugada — intenta de nuevo.', status: 409 };
}
