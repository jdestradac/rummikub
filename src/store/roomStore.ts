import { create } from 'zustand';

export interface RoomPlayerView {
  id: string;
  userId: string | null;
  name: string;
  isBot: boolean;
  seat: number;
  isConnected: boolean;
}

interface RoomStoreState {
  roomId: string | null;
  roomCode: string | null;
  hostId: string | null;
  status: 'waiting' | 'playing' | 'finished';
  maxPlayers: number;
  botCount: number;
  players: RoomPlayerView[];
  myPlayerId: string | null;

  setRoom: (room: {
    roomId: string;
    roomCode: string;
    hostId: string;
    status: 'waiting' | 'playing' | 'finished';
    maxPlayers: number;
    botCount: number;
  }) => void;
  setMyPlayerId: (id: string) => void;
  setPlayers: (players: RoomPlayerView[]) => void;
  setStatus: (status: 'waiting' | 'playing' | 'finished') => void;
  setBotCount: (count: number) => void;
  reset: () => void;
}

const initialState = {
  roomId: null as string | null,
  roomCode: null as string | null,
  hostId: null as string | null,
  status: 'waiting' as 'waiting' | 'playing' | 'finished',
  maxPlayers: 4,
  botCount: 0,
  players: [] as RoomPlayerView[],
  myPlayerId: null as string | null,
};

export const useRoomStore = create<RoomStoreState>((set) => ({
  ...initialState,

  setRoom: (room) =>
    set({
      roomId: room.roomId,
      roomCode: room.roomCode,
      hostId: room.hostId,
      status: room.status,
      maxPlayers: room.maxPlayers,
      botCount: room.botCount,
    }),

  setMyPlayerId: (id) => set({ myPlayerId: id }),
  setPlayers: (players) => set({ players }),
  setStatus: (status) => set({ status }),
  setBotCount: (count) => set({ botCount: count }),
  reset: () => set(initialState),
}));

export function isHost(state: { hostId: string | null; myPlayerId: string | null; players: RoomPlayerView[] }): boolean {
  if (!state.myPlayerId || !state.hostId) return false;
  const me = state.players.find((p) => p.id === state.myPlayerId);
  return !!me && me.userId === state.hostId;
}
