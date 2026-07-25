'use client';

import { useEffect, useRef } from 'react';
import type { RealtimePresenceState } from '@supabase/supabase-js';
import { getSupabaseBrowserClient } from '@/db/client';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore, type RoomPlayerView } from '@/store/roomStore';
import type { GameEvent, PublicGameState, Score } from '@/core/types';

interface PresenceMeta {
  playerId: string;
  online_at: string;
  [key: string]: unknown;
}

/**
 * Subscribes to the two realtime channels for a room:
 *  - `room:{roomId}` (Presence) tracks who is actually connected right now.
 *  - `game:{roomId}` (Broadcast) carries authoritative state updates that the
 *    server pushes after every mutation.
 */
export function useRealtimeGame(roomId: string | null, playerId: string | null) {
  const hydratePublicState = useGameStore((s) => s.hydratePublicState);
  const pushEvent = useGameStore((s) => s.pushEvent);
  const setFinalScores = useGameStore((s) => s.setFinalScores);
  const setBotThinking = useGameStore((s) => s.setBotThinking);
  const players = useRoomStore((s) => s.players);
  const setPlayers = useRoomStore((s) => s.setPlayers);
  const playersRef = useRef<RoomPlayerView[]>(players);
  playersRef.current = players;

  useEffect(() => {
    if (!roomId || !playerId) return;
    const supabase = getSupabaseBrowserClient();

    const gameChannel = supabase.channel(`game:${roomId}`, {
      config: { broadcast: { self: true } },
    });

    gameChannel
      .on('broadcast', { event: 'game:started' }, ({ payload }) => {
        hydratePublicState(payload as PublicGameState);
      })
      .on('broadcast', { event: 'state:updated' }, ({ payload }) => {
        hydratePublicState(payload as PublicGameState);
      })
      .on('broadcast', { event: 'player:drew' }, () => {
        // Public state already reflects the updated draw pile count / tile
        // counts; this event exists purely to trigger a toast client-side.
      })
      .on('broadcast', { event: 'bot:thinking' }, ({ payload }) => {
        setBotThinking(Boolean((payload as { thinking?: boolean })?.thinking));
      })
      .on('broadcast', { event: 'game:finished' }, ({ payload }) => {
        const data = payload as { winnerId: string; finalScores: Score[] };
        setFinalScores(data.finalScores);
      })
      .on('broadcast', { event: 'game:log' }, ({ payload }) => {
        pushEvent(payload as GameEvent);
      })
      .subscribe();

    const presenceChannel = supabase.channel(`room:${roomId}`, {
      config: { presence: { key: playerId } },
    });

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState<PresenceMeta>();
        applyPresence(state, playersRef.current, setPlayers);
      })
      .on<PresenceMeta>('presence', { event: 'leave' }, ({ leftPresences }) => {
        for (const presence of leftPresences) {
          void fetch('/api/game/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerId: presence.playerId, isConnected: false }),
          }).catch(() => undefined);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ playerId, online_at: new Date().toISOString() });
          void fetch('/api/game/presence', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ roomId, playerId, isConnected: true }),
          }).catch(() => undefined);
        }
      });

    return () => {
      supabase.removeChannel(gameChannel);
      supabase.removeChannel(presenceChannel);
    };
  }, [roomId, playerId, hydratePublicState, pushEvent, setFinalScores, setBotThinking, setPlayers]);
}

function applyPresence(
  state: RealtimePresenceState<PresenceMeta>,
  currentPlayers: RoomPlayerView[],
  setPlayers: (players: RoomPlayerView[]) => void,
) {
  const onlineIds = new Set(Object.keys(state));
  const updated = currentPlayers.map((p) => ({
    ...p,
    isConnected: onlineIds.has(p.id) || p.isBot,
  }));
  setPlayers(updated);
}
