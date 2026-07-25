-- Row Level Security policies for Rummikub
--
-- Design notes:
--  * All game-state mutation happens server-side through API routes using the
--    SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS entirely. Client-side
--    (anon/authenticated) roles are therefore read-only everywhere except the
--    narrow "join room" insert on players.
--  * `game_states.racks` holds every player's tiles in one JSON blob, so a
--    row-level policy cannot hide part of it. Direct table SELECT on
--    game_states is denied for anon/authenticated; instead a SECURITY DEFINER
--    RPC (`get_my_game_state`) returns board/current_turn/phase/draw pile
--    count for everyone in the room plus ONLY the caller's own rack.

alter table rooms enable row level security;
alter table players enable row level security;
alter table game_states enable row level security;
alter table game_events enable row level security;

-- ---------------------------------------------------------------------------
-- rooms: publicly readable (needed to resolve a join code / show lobby info),
-- writes only via service role (API routes).
-- ---------------------------------------------------------------------------
drop policy if exists rooms_select_all on rooms;
create policy rooms_select_all on rooms
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- players: everyone in a room can see everyone else's public player row
-- (name, seat, tile_count, score, connection status - never their tiles).
-- ---------------------------------------------------------------------------
drop policy if exists players_select_all on players;
create policy players_select_all on players
  for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- game_states: no direct client access. All reads go through the
-- get_my_game_state() RPC below; all writes go through the service role.
-- (No policies created => RLS default-denies anon/authenticated entirely.)
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- game_events: players in the room can read the event log for that room.
-- ---------------------------------------------------------------------------
drop policy if exists game_events_select_room_members on game_events;
create policy game_events_select_room_members on game_events
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from players p
      where p.room_id = game_events.room_id
        and p.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- get_my_game_state: sanitized read of game_states for the calling player.
-- Returns board, current_turn, phase, winner_id, draw pile count, and only
-- the caller's own rack (matched via players.user_id = auth.uid()).
-- ---------------------------------------------------------------------------
create or replace function get_my_game_state(p_room_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_id uuid;
  v_state game_states%rowtype;
  v_rack jsonb;
begin
  select id into v_player_id
  from players
  where room_id = p_room_id
    and user_id = auth.uid()
  limit 1;

  if v_player_id is null then
    return null;
  end if;

  select * into v_state
  from game_states
  where room_id = p_room_id;

  if not found then
    return null;
  end if;

  v_rack := coalesce(v_state.racks -> v_player_id::text, '[]'::jsonb);

  return jsonb_build_object(
    'roomId', v_state.room_id,
    'currentTurn', v_state.current_turn,
    'board', v_state.board,
    'myRack', v_rack,
    'drawPileCount', jsonb_array_length(v_state.draw_pile),
    'phase', v_state.phase,
    'winnerId', v_state.winner_id,
    'updatedAt', v_state.updated_at
  );
end;
$$;

revoke all on function get_my_game_state(uuid) from public;
grant execute on function get_my_game_state(uuid) to anon, authenticated;
