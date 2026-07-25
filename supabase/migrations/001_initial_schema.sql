-- Rummikub initial schema
-- Requires pgcrypto for gen_random_uuid()
create extension if not exists pgcrypto;

-- Rooms
create table if not exists rooms (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,           -- 6-char uppercase join code
  host_id     uuid not null,
  status      text not null default 'waiting' check (status in ('waiting', 'playing', 'finished')),
  max_players int not null default 4 check (max_players between 2 and 4),
  bot_count   int not null default 0 check (bot_count between 0 and 3),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

create index if not exists rooms_code_idx on rooms (code);

-- Players (human and bot)
create table if not exists players (
  id          uuid primary key default gen_random_uuid(),
  room_id     uuid not null references rooms(id) on delete cascade,
  user_id     uuid,                           -- null for bots
  name        text not null,
  is_bot      boolean not null default false,
  seat        int not null,                   -- turn order 0-3
  tile_count  int not null default 0,
  has_opened  boolean not null default false, -- made initial 30+ pts move
  score       int not null default 0,
  is_connected boolean not null default true,
  joined_at   timestamptz default now(),
  unique (room_id, seat)
);

create index if not exists players_room_id_idx on players (room_id);
create index if not exists players_user_id_idx on players (user_id);

-- Game state (single row per room, updated atomically)
create table if not exists game_states (
  room_id       uuid primary key references rooms(id) on delete cascade,
  current_turn  int not null default 0,       -- seat index
  board         jsonb not null default '[]',  -- array of TileGroup
  draw_pile     jsonb not null default '[]',  -- remaining tiles (server only)
  racks         jsonb not null default '{}',  -- map of player_id -> Tile[]
  turn_snapshot jsonb,                        -- board+rack at start of turn (for undo)
  phase         text not null default 'playing' check (phase in ('playing', 'finished')),
  winner_id     uuid,
  updated_at    timestamptz default now()
);

-- Game event log
create table if not exists game_events (
  id          bigserial primary key,
  room_id     uuid not null references rooms(id) on delete cascade,
  player_id   uuid,
  event_type  text not null,                  -- 'place', 'draw', 'invalid', 'win', 'bot_play'
  payload     jsonb,
  created_at  timestamptz default now()
);

create index if not exists game_events_room_id_idx on game_events (room_id, created_at desc);

-- keep updated_at fresh
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists rooms_set_updated_at on rooms;
create trigger rooms_set_updated_at
  before update on rooms
  for each row execute procedure set_updated_at();

drop trigger if exists game_states_set_updated_at on game_states;
create trigger game_states_set_updated_at
  before update on game_states
  for each row execute procedure set_updated_at();
