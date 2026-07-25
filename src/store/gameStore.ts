import { create } from 'zustand';
import type { GameEvent, GamePhase, PublicGameState, PublicPlayer, Score, Tile, TileGroup } from '@/core/types';

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

  init: (roomId: string, myPlayerId: string) => void;
  hydratePublicState: (state: PublicGameState) => void;
  setHasPlacedThisTurn: (value: boolean) => void;
  setMyRack: (rack: Tile[]) => void;
  setBoard: (board: TileGroup[]) => void;
  selectTile: (tileId: string | null) => void;
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
};

export const useGameStore = create<GameStoreState>((set) => ({
  ...initialState,

  init: (roomId, myPlayerId) => set({ roomId, myPlayerId }),

  hydratePublicState: (state) =>
    set((s) => ({
      phase: state.phase,
      currentTurn: state.currentTurn,
      board: state.board,
      players: state.players,
      drawPileCount: state.drawPileCount,
      winnerId: state.winnerId,
      hasPlacedThisTurn: state.currentTurn === s.currentTurn ? s.hasPlacedThisTurn : false,
    })),

  setHasPlacedThisTurn: (value) => set({ hasPlacedThisTurn: value }),

  setMyRack: (rack) => set({ myRack: rack }),

  setBoard: (board) => set({ board }),

  selectTile: (tileId) => set({ selectedTileId: tileId }),

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
