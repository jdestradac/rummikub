import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/supabase';
import { fetchServerGameState, saveGameState, syncPlayersFromState, insertGameEvent } from '@/db/queries/gameState';
import { updateRoomStatus } from '@/db/queries/rooms';
import { applyBotMove, isBotTurn, getCurrentPlayerId, toPublicGameState } from '@/core/gameEngine';
import { computeBotMove } from '@/core/ai';
import { calculateFinalScores } from '@/core/scoring';
import { broadcastGameEvent } from '@/db/realtime';
import { BOT_THINK_DELAY_MS } from '@/lib/constants';

const MAX_BOT_CHAIN = 8;

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs bot turns one after another (in case several bots are seated
 * consecutively) until it becomes a human's turn again or the game ends.
 * Called after every action that could hand the turn to a bot.
 */
export async function maybeTriggerBotTurn(supabase: SupabaseClient<Database>, roomId: string): Promise<void> {
  for (let i = 0; i < MAX_BOT_CHAIN; i++) {
    const loaded = await fetchServerGameState(supabase, roomId);
    if (!loaded || loaded.state.phase !== 'playing') return;
    if (!isBotTurn(loaded.state)) return;

    const botId = getCurrentPlayerId(loaded.state);
    if (!botId) return;

    await broadcastGameEvent(supabase, roomId, {
      event: 'bot:thinking',
      payload: { thinking: true, playerId: botId },
    });

    await delay(BOT_THINK_DELAY_MS);

    const rack = loaded.state.racks[botId] ?? [];
    const move = computeBotMove(rack, loaded.state.board, loaded.state.players.find((p) => p.id === botId)?.hasOpened ?? false);

    const result = applyBotMove(loaded.state, botId, move);
    const saved = await saveGameState(supabase, result.newState, loaded.updatedAt);
    if (!saved) continue; // state moved under us; re-fetch and retry this bot's turn

    await syncPlayersFromState(supabase, result.newState);

    if (result.event) {
      await insertGameEvent(supabase, {
        roomId,
        playerId: result.event.playerId,
        eventType: result.event.eventType,
      });
      await broadcastGameEvent(supabase, roomId, {
        event: 'game:log',
        payload: { ...result.event, id: `${Date.now()}-${botId}`, timestamp: new Date().toISOString() },
      });
    }

    await broadcastGameEvent(supabase, roomId, {
      event: 'bot:thinking',
      payload: { thinking: false, playerId: botId },
    });

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
      return;
    }

    await broadcastGameEvent(supabase, roomId, {
      event: 'state:updated',
      payload: toPublicGameState(result.newState),
    });
  }
}
