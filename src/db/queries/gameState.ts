import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, Json } from '@/types/supabase';
import type { ServerGameState, ServerPlayer, Tile, TileGroup } from '@/core/types';

type Client = SupabaseClient<Database>;

export interface LoadedGameState {
  state: ServerGameState;
  updatedAt: string;
}

/**
 * Loads the full server-authoritative game state for a room: the single
 * `game_states` row plus the `players` table (which holds identity/seat
 * data not duplicated in the JSON blob).
 */
export async function fetchServerGameState(supabase: Client, roomId: string): Promise<LoadedGameState | null> {
  const [gameStateResult, playersResult] = await Promise.all([
    supabase.from('game_states').select('*').eq('room_id', roomId).maybeSingle(),
    supabase.from('players').select('*').eq('room_id', roomId).order('seat', { ascending: true }),
  ]);

  if (gameStateResult.error) throw gameStateResult.error;
  if (playersResult.error) throw playersResult.error;
  if (!gameStateResult.data) return null;

  const row = gameStateResult.data;
  const players: ServerPlayer[] = (playersResult.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    isBot: p.is_bot,
    seat: p.seat,
    hasOpened: p.has_opened,
    score: p.score,
    isConnected: p.is_connected,
  }));

  const state: ServerGameState = {
    roomId,
    phase: row.phase,
    currentTurn: row.current_turn,
    board: (row.board as unknown as TileGroup[]) ?? [],
    drawPile: (row.draw_pile as unknown as Tile[]) ?? [],
    racks: (row.racks as unknown as Record<string, Tile[]>) ?? {},
    turnSnapshot: (row.turn_snapshot as unknown as ServerGameState['turnSnapshot']) ?? null,
    players,
    winnerId: row.winner_id,
  };

  return { state, updatedAt: row.updated_at };
}

export async function insertGameState(supabase: Client, state: ServerGameState): Promise<void> {
  const { error } = await supabase.from('game_states').insert({
    room_id: state.roomId,
    current_turn: state.currentTurn,
    board: state.board as unknown as Json,
    draw_pile: state.drawPile as unknown as Json,
    racks: state.racks as unknown as Json,
    turn_snapshot: state.turnSnapshot as unknown as Json,
    // `game_states` rows only ever exist once a game has started, so `phase`
    // here is always 'playing' | 'finished' — the broader GamePhase type
    // (which also covers the pre-game 'waiting' room status) doesn't apply.
    phase: state.phase as 'playing' | 'finished',
    winner_id: state.winnerId,
  });

  if (error) throw error;
}

/** Inserts or fully overwrites the game_states row for a room (used on (re)start). */
export async function upsertGameState(supabase: Client, state: ServerGameState): Promise<void> {
  const { error } = await supabase.from('game_states').upsert(
    {
      room_id: state.roomId,
      current_turn: state.currentTurn,
      board: state.board as unknown as Json,
      draw_pile: state.drawPile as unknown as Json,
      racks: state.racks as unknown as Json,
      turn_snapshot: state.turnSnapshot as unknown as Json,
      // `game_states` rows only ever exist once a game has started, so `phase`
    // here is always 'playing' | 'finished' — the broader GamePhase type
    // (which also covers the pre-game 'waiting' room status) doesn't apply.
    phase: state.phase as 'playing' | 'finished',
      winner_id: state.winnerId,
    },
    { onConflict: 'room_id' },
  );

  if (error) throw error;
}

/**
 * Persists `state`. When `expectedUpdatedAt` is provided, the write is
 * conditioned on the row not having changed since it was read (optimistic
 * concurrency in place of a SELECT ... FOR UPDATE lock, which PostgREST
 * doesn't expose directly). Returns false if the row had already moved on
 * and the caller should re-fetch and retry.
 */
export async function saveGameState(
  supabase: Client,
  state: ServerGameState,
  expectedUpdatedAt?: string,
): Promise<boolean> {
  let query = supabase
    .from('game_states')
    .update({
      current_turn: state.currentTurn,
      board: state.board as unknown as Json,
      draw_pile: state.drawPile as unknown as Json,
      racks: state.racks as unknown as Json,
      turn_snapshot: state.turnSnapshot as unknown as Json,
      // `game_states` rows only ever exist once a game has started, so `phase`
    // here is always 'playing' | 'finished' — the broader GamePhase type
    // (which also covers the pre-game 'waiting' room status) doesn't apply.
    phase: state.phase as 'playing' | 'finished',
      winner_id: state.winnerId,
    })
    .eq('room_id', state.roomId);

  if (expectedUpdatedAt) {
    query = query.eq('updated_at', expectedUpdatedAt);
  }

  const { data, error } = await query.select('room_id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

/**
 * Mirrors per-player derived fields (tile count, opened flag, score) from
 * the authoritative JSON state back onto the `players` table, so lobby /
 * opponent UI can read cheap columns instead of the full state blob.
 */
export async function syncPlayersFromState(supabase: Client, state: ServerGameState): Promise<void> {
  await Promise.all(
    state.players.map((p) =>
      supabase
        .from('players')
        .update({
          tile_count: (state.racks[p.id] ?? []).length,
          has_opened: p.hasOpened,
          score: p.score,
        })
        .eq('id', p.id),
    ),
  );
}

export async function insertGameEvent(
  supabase: Client,
  params: { roomId: string; playerId: string | null; eventType: string; payload?: Json },
): Promise<void> {
  const { error } = await supabase.from('game_events').insert({
    room_id: params.roomId,
    player_id: params.playerId,
    event_type: params.eventType,
    payload: params.payload ?? null,
  });

  if (error) throw error;
}
