// Pure domain types for the Rummikub game engine.
// This module has zero React / Supabase dependencies.

export type TileColor = 'red' | 'blue' | 'black' | 'orange';

export interface Tile {
  id: string; // e.g. "red-7-1" (color-number-copy) or "joker-1"
  color: TileColor | 'joker';
  number: number | null; // null for joker
  isJoker: boolean;
  representsColor?: TileColor; // set when joker is placed on the board
  representsNumber?: number;
}

export interface TileGroup {
  id: string;
  tiles: Tile[];
  type: 'set' | 'run' | 'unknown';
}

export interface PlayerState {
  id: string;
  name: string;
  isBot: boolean;
  seat: number;
  rack: Tile[];
  hasOpened: boolean;
  score: number;
  isConnected: boolean;
}

export interface BoardState {
  groups: TileGroup[];
}

export type GamePhase = 'waiting' | 'playing' | 'finished';

export interface GameState {
  roomId: string;
  phase: GamePhase;
  currentTurn: number;
  board: BoardState;
  players: PlayerState[];
  myRack: Tile[];
  drawPileCount: number;
  winnerId: string | null;
  events: GameEvent[];
}

export interface GameEvent {
  id: string;
  playerId: string | null;
  playerName: string;
  eventType: 'place' | 'draw' | 'invalid' | 'win' | 'bot_play' | 'join' | 'leave';
  description: string;
  timestamp: string;
}

export type PlayerAction =
  | { type: 'PLACE_TILE'; tileId: string; groupId: string; position: number }
  | { type: 'MOVE_TILE'; tileId: string; fromGroupId: string; toGroupId: string; position: number }
  | { type: 'CREATE_GROUP'; tileIds: string[] }
  | { type: 'SPLIT_GROUP'; groupId: string; splitAt: number }
  | { type: 'CONFIRM_TURN' }
  | { type: 'UNDO_TURN' }
  | { type: 'DRAW_TILE' };

export interface ValidationResult {
  valid: boolean;
  invalidGroupIds: string[];
  errors: string[];
}

// ---------------------------------------------------------------------------
// Server-authoritative state, as persisted in the `game_states` table.
// Unlike GameState (client view), this holds every player's rack and the
// full draw pile, and is never sent to clients wholesale.
// ---------------------------------------------------------------------------
export interface ServerPlayer {
  id: string;
  name: string;
  isBot: boolean;
  seat: number;
  hasOpened: boolean;
  score: number;
  isConnected: boolean;
}

export interface ServerGameState {
  roomId: string;
  phase: GamePhase;
  currentTurn: number;
  board: TileGroup[];
  drawPile: Tile[];
  racks: Record<string, Tile[]>; // player_id -> tiles
  turnSnapshot: { board: TileGroup[]; rack: Tile[] } | null;
  players: ServerPlayer[];
  winnerId: string | null;
}

export interface ActionResult {
  success: boolean;
  newState: ServerGameState;
  error?: string;
  event?: Omit<GameEvent, 'id' | 'timestamp'>;
}

// ---------------------------------------------------------------------------
// Bot / AI
// ---------------------------------------------------------------------------
export interface BoardExtension {
  groupId: string;
  tiles: Tile[]; // tiles from the bot's rack appended/prepended to the group
}

export interface BotMove {
  newGroups: TileGroup[]; // groups formed purely from rack tiles
  boardExtensions: BoardExtension[]; // tiles added to existing board groups
  tilesToPlace: string[]; // tile IDs being played
  shouldDraw: boolean;
}

// ---------------------------------------------------------------------------
// Public (sanitized) state broadcast to all clients in a room.
// ---------------------------------------------------------------------------
export interface PublicPlayer {
  id: string;
  name: string;
  isBot: boolean;
  seat: number;
  tileCount: number;
  hasOpened: boolean;
  score: number;
  isConnected: boolean;
}

export interface PublicGameState {
  roomId: string;
  phase: GamePhase;
  currentTurn: number;
  board: TileGroup[];
  players: PublicPlayer[];
  drawPileCount: number;
  winnerId: string | null;
}

export interface Score {
  playerId: string;
  playerName: string;
  score: number;
}

export type RealtimeGameEvent =
  | { event: 'game:started'; payload: PublicGameState }
  | { event: 'state:updated'; payload: PublicGameState }
  | { event: 'player:drew'; payload: { playerId: string } }
  | { event: 'game:finished'; payload: { winnerId: string; finalScores: Score[] } }
  | { event: 'game:log'; payload: GameEvent }
  | { event: 'bot:thinking'; payload: { thinking: boolean; playerId: string } };
