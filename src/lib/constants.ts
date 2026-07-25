export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 4;
export const MAX_BOTS = 3;
export const TILES_PER_HAND = 14;
export const OPENING_MELD_MIN = 30;
export const PENALTY_TILE_COUNT = 3;
export const BOT_THINK_DELAY_MS = 1500;
export const TOAST_DURATION_MS = 3000;

export const ROOM_CODE_LENGTH = 6;

export const BOT_NAMES = ['Bot Alpha', 'Bot Beta', 'Bot Gamma'] as const;

export const PLAYER_SESSION_STORAGE_KEY = 'rummikub:player-session';

export const KEYBOARD_SHORTCUTS = {
  UNDO: 'u',
  CONFIRM: 'Enter',
  DRAW: 'd',
  DESELECT: 'Escape',
  SORT: 's',
} as const;

export const RESPONSIVE_BREAKPOINT_PX = 1024;
