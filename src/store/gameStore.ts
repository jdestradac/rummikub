import { create } from 'zustand';
import type { GameEvent, GamePhase, PublicGameState, PublicPlayer, Score, Tile, TileGroup } from '@/core/types';
import { addTileToGroup, createGroup, findGroupById, removeTileFromGroup, replaceGroup } from '@/core/board';
import { RACK_SENTINEL } from '@/core/gameEngine';

export type RackSort = 'color' | 'number';

interface GameStoreState {
  roomId: string | null;
  myPlayerId: string | null;

  phase: GamePhase;
  currentTurn: number;
  board: TileGroup[];
  players: PublicPlayer[];
  drawPileCount: number;
  winnerId: string | null;
  finalScores: Score[] | null;

  myRack: Tile[];
  selectedTileId: string | null;
  rackSort: RackSort;

  events: GameEvent[];
  isSubmitting: boolean;
  botThinking: boolean;
  errorMessage: string | null;
  hasPlacedThisTurn: boolean;
  lastHydratedAt: number;

  init: (roomId: string, myPlayerId: string) => void;
  hydratePublicState: (state: PublicGameState, requestedAt?: number) => void;
  setHasPlacedThisTurn: (value: boolean) => void;
  setMyRack: (rack: Tile[], requestedAt?: number) => void;
  setBoard: (board: TileGroup[]) => void;
  selectTile: (tileId: string | null) => void;
  optimisticPlaceFromRack: (tileId: string, groupId: string, position: number) => void;
  optimisticMoveOnBoard: (tileId: string, fromGroupId: string, toGroupId: string, position: number) => void;
  setRackSort: (sort: RackSort) => void;
  pushEvent: (event: GameEvent) => void;
  setFinalScores: (scores: Score[] | null) => void;
  setSubmitting: (submitting: boolean) => void;
  setBotThinking: (thinking: boolean) => void;
  setError: (message: string | null) => void;
  reset: () => void;
}

const initialState = {
  roomId: null as string | null,
  myPlayerId: null as string | null,
  phase: 'waiting' as GamePhase,
  currentTurn: 0,
  board: [] as TileGroup[],
  players: [] as PublicPlayer[],
  drawPileCount: 0,
  winnerId: null as string | null,
  finalScores: null as Score[] | null,
  myRack: [] as Tile[],
  selectedTileId: null as string | null,
  rackSort: 'color' as RackSort,
  events: [] as GameEvent[],
  isSubmitting: false,
  botThinking: false,
  errorMessage: null as string | null,
  hasPlacedThisTurn: false,
  lastHydratedAt: 0,
};

export const useGameStore = create<GameStoreState>((set) => ({
  ...initialState,

  init: (roomId, myPlayerId) => set({ roomId, myPlayerId }),

  hydratePublicState: (state, requestedAt = Date.now()) =>
    set((s) => {
      // Poll responses, action responses, and broadcasts can all resolve
      // out of order (independent HTTP requests / a slower earlier
      // request). Only ever apply the one that was most recently
      // *initiated*, so a stale response can't revert fresher state (which
      // otherwise silently breaks things like whose turn it is).
      if (requestedAt < s.lastHydratedAt) return {};

      return {
        phase: state.phase,
        currentTurn: state.currentTurn,
        board: state.board,
        players: state.players,
        drawPileCount: state.drawPileCount,
        winnerId: state.winnerId,
        hasPlacedThisTurn: state.currentTurn === s.currentTurn ? s.hasPlacedThisTurn : false,
        lastHydratedAt: requestedAt,
      };
    }),

  setHasPlacedThisTurn: (value) => set({ hasPlacedThisTurn: value }),

  setMyRack: (rack, requestedAt = Date.now()) =>
    set((s) => (requestedAt < s.lastHydratedAt ? {} : { myRack: rack })),

  setBoard: (board) => set({ board }),

  selectTile: (tileId) => set({ selectedTileId: tileId }),

  optimisticPlaceFromRack: (tileId, groupId, position) =>
    set((s) => {
      const tileIndex = s.myRack.findIndex((t) => t.id === tileId);
      if (tileIndex === -1) return {};
      const tile = s.myRack[tileIndex]!;
      const newRack = [...s.myRack];
      newRack.splice(tileIndex, 1);

      const existingGroup = findGroupById(s.board, groupId);
      const board = existingGroup
        ? replaceGroup(s.board, groupId, addTileToGroup(existingGroup, tile, position))
        : [...s.board, createGroup([tile], groupId)];

      return { myRack: newRack, board, hasPlacedThisTurn: true };
    }),

  optimisticMoveOnBoard: (tileId, fromGroupId, toGroupId, position) =>
    set((s) => {
      const fromGroup = findGroupById(s.board, fromGroupId);
      if (!fromGroup) return {};
      const { group: updatedFrom, tile } = removeTileFromGroup(fromGroup, tileId);
      if (!tile) return {};

      let board = replaceGroup(s.board, fromGroupId, updatedFrom.tiles.length ? updatedFrom : null);

      if (toGroupId === RACK_SENTINEL) {
        return { board, myRack: [...s.myRack, tile], hasPlacedThisTurn: true };
      }

      const toGroup = findGroupById(board, toGroupId);
      board = toGroup
        ? replaceGroup(board, toGroupId, addTileToGroup(toGroup, tile, position))
        : [...board, createGroup([tile], toGroupId)];

      return { board, hasPlacedThisTurn: true };
    }),

  setRackSort: (sort) => set({ rackSort: sort }),

  pushEvent: (event) =>
    set((s) => ({
      events: [...s.events, event].slice(-100),
    })),

  setFinalScores: (scores) => set({ finalScores: scores }),

  setSubmitting: (submitting) => set({ isSubmitting: submitting }),

  setBotThinking: (thinking) => set({ botThinking: thinking }),

  setError: (message) => set({ errorMessage: message }),

  reset: () => set(initialState),
}));

/** The value a tile sorts/clusters by within a given rack sort mode. */
export function rackClusterKey(tile: Tile, sort: RackSort): string {
  const number = tile.isJoker ? (tile.representsNumber ?? 99) : (tile.number ?? 0);
  return sort === 'number' ? String(number) : tile.color;
}

export function sortRack(rack: Tile[], sort: RackSort): Tile[] {
  const sorted = [...rack];
  if (sort === 'number') {
    sorted.sort((a, b) => {
      const an = a.isJoker ? (a.representsNumber ?? 99) : (a.number ?? 0);
      const bn = b.isJoker ? (b.representsNumber ?? 99) : (b.number ?? 0);
      if (an !== bn) return an - bn;
      return a.color.localeCompare(b.color);
    });
  } else {
    sorted.sort((a, b) => {
      if (a.color !== b.color) return a.color.localeCompare(b.color);
      const an = a.isJoker ? (a.representsNumber ?? 99) : (a.number ?? 0);
      const bn = b.isJoker ? (b.representsNumber ?? 99) : (b.number ?? 0);
      return an - bn;
    });
  }
  return sorted;
}
