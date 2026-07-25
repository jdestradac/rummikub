import type {
  ActionResult,
  PlayerAction,
  PublicGameState,
  ServerGameState,
  ServerPlayer,
  Tile,
  TileGroup,
  BotMove,
} from './types';
import {
  addTileToGroup,
  allBoardTileIds,
  cloneBoard,
  createGroup,
  findGroupById,
  removeTileFromGroup,
  replaceGroup,
  splitGroup as splitGroupPrimitive,
} from './board';
import { canOpenWith, validateBoard } from './validator';
import { createShuffledDeck, dealTiles } from './deck';

const PENALTY_TILE_COUNT = 3;

/** Sentinel used as MOVE_TILE's `toGroupId` to return a board tile to the acting player's rack. */
export const RACK_SENTINEL = '__rack__';

export interface NewPlayerInput {
  id: string;
  name: string;
  isBot: boolean;
  seat: number;
}

function cloneState(state: ServerGameState): ServerGameState {
  return {
    ...state,
    board: cloneBoard(state.board),
    drawPile: [...state.drawPile],
    racks: Object.fromEntries(Object.entries(state.racks).map(([id, tiles]) => [id, [...tiles]])),
    turnSnapshot: state.turnSnapshot
      ? { board: cloneBoard(state.turnSnapshot.board), rack: [...state.turnSnapshot.rack] }
      : null,
    players: state.players.map((p) => ({ ...p })),
  };
}

function currentPlayer(state: ServerGameState): ServerPlayer | null {
  return state.players.find((p) => p.seat === state.currentTurn) ?? null;
}

function playerIdForSeat(state: ServerGameState, seat: number): string {
  return state.players.find((p) => p.seat === seat)?.id ?? '';
}

function nextSeat(state: ServerGameState): number {
  const seats = state.players.map((p) => p.seat).sort((a, b) => a - b);
  const idx = seats.indexOf(state.currentTurn);
  return seats[(idx + 1) % seats.length]!;
}

function snapshotFor(state: ServerGameState, playerId: string): { board: TileGroup[]; rack: Tile[] } {
  return { board: cloneBoard(state.board), rack: [...(state.racks[playerId] ?? [])] };
}

function fail(state: ServerGameState, error: string): ActionResult {
  return { success: false, newState: state, error };
}

/**
 * Single source of truth for all player-driven game-state mutations.
 * Deep-clones `state`, applies `action` for `playerId`, and returns the
 * result. Never mutates its input.
 */
export function applyAction(state: ServerGameState, action: PlayerAction, playerId: string): ActionResult {
  if (state.phase !== 'playing') return fail(state, 'Game is not currently in progress.');

  const working = cloneState(state);
  const player = currentPlayer(working);

  if (!player) return fail(state, 'No active player found for the current turn.');
  if (player.id !== playerId) return fail(state, 'It is not your turn.');

  switch (action.type) {
    case 'PLACE_TILE':
      return handlePlaceTile(working, playerId, action.tileId, action.groupId, action.position);
    case 'MOVE_TILE':
      return handleMoveTile(working, playerId, action.tileId, action.fromGroupId, action.toGroupId, action.position);
    case 'CREATE_GROUP':
      return handleCreateGroup(working, playerId, action.tileIds);
    case 'SPLIT_GROUP':
      return handleSplitGroup(working, action.groupId, action.splitAt);
    case 'CONFIRM_TURN':
      return handleConfirmTurn(working, playerId);
    case 'UNDO_TURN':
      return handleUndoTurn(working, playerId);
    case 'DRAW_TILE':
      return handleDrawTile(working, playerId);
    default:
      return fail(state, 'Unknown action type.');
  }
}

function handlePlaceTile(
  state: ServerGameState,
  playerId: string,
  tileId: string,
  groupId: string,
  position: number,
): ActionResult {
  const rack = state.racks[playerId] ?? [];
  const tileIndex = rack.findIndex((t) => t.id === tileId);
  if (tileIndex === -1) return fail(state, 'Tile not found in your rack.');

  const tile = rack[tileIndex]!;
  const newRack = [...rack];
  newRack.splice(tileIndex, 1);
  state.racks[playerId] = newRack;

  const existingGroup = findGroupById(state.board, groupId);
  if (existingGroup) {
    const updated = addTileToGroup(existingGroup, tile, position);
    state.board = replaceGroup(state.board, groupId, updated);
  } else {
    state.board = [...state.board, createGroup([tile], groupId)];
  }

  return { success: true, newState: state };
}

function handleMoveTile(
  state: ServerGameState,
  playerId: string,
  tileId: string,
  fromGroupId: string,
  toGroupId: string,
  position: number,
): ActionResult {
  const fromGroup = findGroupById(state.board, fromGroupId);
  if (!fromGroup) return fail(state, 'Source group not found on the board.');

  const { group: updatedFrom, tile } = removeTileFromGroup(fromGroup, tileId);
  if (!tile) return fail(state, 'Tile not found in the source group.');

  state.board = replaceGroup(state.board, fromGroupId, updatedFrom.tiles.length ? updatedFrom : null);

  if (toGroupId === RACK_SENTINEL) {
    const rack = state.racks[playerId] ?? [];
    state.racks[playerId] = [...rack, tile];
    return { success: true, newState: state };
  }

  const toGroup = findGroupById(state.board, toGroupId);
  if (toGroup) {
    const updatedTo = addTileToGroup(toGroup, tile, position);
    state.board = replaceGroup(state.board, toGroupId, updatedTo);
  } else {
    state.board = [...state.board, createGroup([tile], toGroupId)];
  }

  return { success: true, newState: state };
}

function handleCreateGroup(state: ServerGameState, playerId: string, tileIds: string[]): ActionResult {
  const rack = state.racks[playerId] ?? [];
  let remaining = [...rack];
  const tiles: Tile[] = [];

  for (const id of tileIds) {
    const idx = remaining.findIndex((t) => t.id === id);
    if (idx === -1) return fail(state, `Tile ${id} not found in your rack.`);
    tiles.push(remaining[idx]!);
    remaining = remaining.filter((_, i) => i !== idx);
  }

  state.racks[playerId] = remaining;
  state.board = [...state.board, createGroup(tiles)];

  return { success: true, newState: state };
}

function handleSplitGroup(state: ServerGameState, groupId: string, splitAt: number): ActionResult {
  const group = findGroupById(state.board, groupId);
  if (!group) return fail(state, 'Group not found on the board.');
  if (splitAt <= 0 || splitAt >= group.tiles.length) return fail(state, 'Invalid split position.');

  const [left, right] = splitGroupPrimitive(group, splitAt);
  state.board = [...replaceGroup(state.board, groupId, null), left, right];

  return { success: true, newState: state };
}

function drawPenalty(state: ServerGameState, playerId: string, reason: string): ActionResult {
  const snapshot = state.turnSnapshot ?? { board: [], rack: state.racks[playerId] ?? [] };
  state.board = cloneBoard(snapshot.board);

  const drawn: Tile[] = [];
  for (let i = 0; i < PENALTY_TILE_COUNT; i++) {
    const tile = state.drawPile.pop();
    if (tile) drawn.push(tile);
  }
  state.racks[playerId] = [...snapshot.rack, ...drawn];

  state.currentTurn = nextSeat(state);
  state.turnSnapshot = snapshotFor(state, playerIdForSeat(state, state.currentTurn));

  return { success: false, newState: state, error: reason };
}

function handleConfirmTurn(state: ServerGameState, playerId: string): ActionResult {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return fail(state, 'Player not found.');

  const snapshot = state.turnSnapshot ?? { board: [], rack: state.racks[playerId] ?? [] };
  const snapshotTileIds = allBoardTileIds(snapshot.board);
  const currentTileIds = allBoardTileIds(state.board);
  const newTileIds = new Set([...currentTileIds].filter((id) => !snapshotTileIds.has(id)));

  if (newTileIds.size === 0) {
    return fail(state, 'You must place at least one tile or draw before confirming.');
  }

  const boardValidation = validateBoard(state.board);
  if (!boardValidation.valid) {
    return drawPenalty(state, playerId, 'The board arrangement is not valid.');
  }

  if (!player.hasOpened) {
    const touchedGroups = state.board.filter((g) => g.tiles.some((t) => newTileIds.has(t.id)));
    const fullyNewGroups = touchedGroups.every((g) => g.tiles.every((t) => newTileIds.has(t.id)));
    if (!fullyNewGroups) {
      return drawPenalty(state, playerId, 'You cannot rearrange the board before your first meld.');
    }
    if (!canOpenWith(touchedGroups)) {
      return drawPenalty(state, playerId, 'Your opening move must total at least 30 points.');
    }
    player.hasOpened = true;
  }

  const rack = state.racks[playerId] ?? [];
  if (rack.length === 0) {
    state.phase = 'finished';
    state.winnerId = playerId;
    return {
      success: true,
      newState: state,
      event: { playerId, playerName: player.name, eventType: 'win', description: `${player.name} wins!` },
    };
  }

  state.currentTurn = nextSeat(state);
  const nextPlayerId = playerIdForSeat(state, state.currentTurn);
  state.turnSnapshot = snapshotFor(state, nextPlayerId);

  return {
    success: true,
    newState: state,
    event: { playerId, playerName: player.name, eventType: 'place', description: `${player.name} confirmed their turn.` },
  };
}

function handleUndoTurn(state: ServerGameState, playerId: string): ActionResult {
  if (!state.turnSnapshot) return fail(state, 'Nothing to undo.');
  state.board = cloneBoard(state.turnSnapshot.board);
  state.racks[playerId] = [...state.turnSnapshot.rack];
  return { success: true, newState: state };
}

function handleDrawTile(state: ServerGameState, playerId: string): ActionResult {
  const snapshot = state.turnSnapshot;
  if (snapshot) {
    const currentTileIds = allBoardTileIds(state.board);
    const snapshotTileIds = allBoardTileIds(snapshot.board);
    const hasPlacedTiles = [...currentTileIds].some((id) => !snapshotTileIds.has(id));
    if (hasPlacedTiles) {
      return fail(state, 'You cannot draw after placing tiles this turn. Undo first.');
    }
  }

  const tile = state.drawPile.pop();
  if (!tile) return fail(state, 'The draw pile is empty.');

  const rack = state.racks[playerId] ?? [];
  state.racks[playerId] = [...rack, tile];

  state.currentTurn = nextSeat(state);
  const nextPlayerId = playerIdForSeat(state, state.currentTurn);
  state.turnSnapshot = snapshotFor(state, nextPlayerId);

  const playerName = state.players.find((p) => p.id === playerId)?.name ?? 'Player';

  return {
    success: true,
    newState: state,
    event: { playerId, playerName, eventType: 'draw', description: `${playerName} drew a tile.` },
  };
}

/** Applies a bot's computed move (see core/ai.ts) directly to the state. */
export function applyBotMove(state: ServerGameState, botId: string, move: BotMove): ActionResult {
  if (state.phase !== 'playing') return fail(state, 'Game is not currently in progress.');

  const working = cloneState(state);
  const player = working.players.find((p) => p.id === botId);
  if (!player) return fail(state, 'Bot not found.');

  if (move.shouldDraw) {
    return handleDrawTile(working, botId);
  }

  let rack = [...(working.racks[botId] ?? [])];
  let placedCount = 0;

  for (const group of move.newGroups) {
    rack = rack.filter((t) => !group.tiles.some((gt) => gt.id === t.id));
    working.board = [...working.board, createGroup(group.tiles)];
    placedCount += group.tiles.length;
  }

  for (const ext of move.boardExtensions) {
    const boardGroup = findGroupById(working.board, ext.groupId);
    if (!boardGroup) continue;
    let updated = boardGroup;
    for (const tile of ext.tiles) {
      updated = addTileToGroup(updated, tile, updated.tiles.length);
      rack = rack.filter((t) => t.id !== tile.id);
      placedCount += 1;
    }
    working.board = replaceGroup(working.board, ext.groupId, updated);
  }

  working.racks[botId] = rack;
  if (!player.hasOpened) player.hasOpened = true;

  if (rack.length === 0) {
    working.phase = 'finished';
    working.winnerId = botId;
    return {
      success: true,
      newState: working,
      event: { playerId: botId, playerName: player.name, eventType: 'win', description: `${player.name} wins!` },
    };
  }

  working.currentTurn = nextSeat(working);
  const nextPlayerId = playerIdForSeat(working, working.currentTurn);
  working.turnSnapshot = snapshotFor(working, nextPlayerId);

  return {
    success: true,
    newState: working,
    event: {
      playerId: botId,
      playerName: player.name,
      eventType: 'bot_play',
      description: `${player.name} placed ${placedCount} tile(s).`,
    },
  };
}

/** Builds a brand-new ServerGameState: shuffles the deck, deals hands, seeds the draw pile. */
export function initializeGame(roomId: string, players: NewPlayerInput[]): ServerGameState {
  const deck = createShuffledDeck();
  const { hands, drawPile } = dealTiles(deck, players.length);

  const racks: Record<string, Tile[]> = {};
  const serverPlayers: ServerPlayer[] = players
    .slice()
    .sort((a, b) => a.seat - b.seat)
    .map((p, i) => {
      racks[p.id] = hands[i] ?? [];
      return {
        id: p.id,
        name: p.name,
        isBot: p.isBot,
        seat: p.seat,
        hasOpened: false,
        score: 0,
        isConnected: true,
      };
    });

  const state: ServerGameState = {
    roomId,
    phase: 'playing',
    currentTurn: 0,
    board: [],
    drawPile,
    racks,
    turnSnapshot: null,
    players: serverPlayers,
    winnerId: null,
  };

  state.turnSnapshot = snapshotFor(state, playerIdForSeat(state, 0));
  return state;
}

export function toPublicGameState(state: ServerGameState): PublicGameState {
  return {
    roomId: state.roomId,
    phase: state.phase,
    currentTurn: state.currentTurn,
    board: state.board,
    players: state.players.map((p) => ({
      id: p.id,
      name: p.name,
      isBot: p.isBot,
      seat: p.seat,
      tileCount: (state.racks[p.id] ?? []).length,
      hasOpened: p.hasOpened,
      score: p.score,
      isConnected: p.isConnected,
    })),
    drawPileCount: state.drawPile.length,
    winnerId: state.winnerId,
  };
}

export function isBotTurn(state: ServerGameState): boolean {
  const player = currentPlayer(state);
  return !!player?.isBot;
}

export function getCurrentPlayerId(state: ServerGameState): string | null {
  return currentPlayer(state)?.id ?? null;
}
