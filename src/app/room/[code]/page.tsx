'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePlayerSession } from '@/hooks/usePlayerSession';
import { useRoomStore } from '@/store/roomStore';
import { RoomLobby } from '@/components/lobby/RoomLobby';
import { GameBoard } from '@/components/game/GameBoard';
import { getSupabaseBrowserClient } from '@/db/client';
import { Spinner } from '@/components/ui/Spinner';

interface RoomPageProps {
  params: { code: string };
}

interface RoomApiResponse {
  room: {
    id: string;
    code: string;
    hostId: string;
    status: 'waiting' | 'playing' | 'finished';
    maxPlayers: number;
    botCount: number;
  };
  players: Array<{
    id: string;
    userId: string | null;
    name: string;
    isBot: boolean;
    seat: number;
    isConnected: boolean;
  }>;
}

export default function RoomPage({ params }: RoomPageProps) {
  const router = useRouter();
  const { session, isReady } = usePlayerSession();
  const setRoom = useRoomStore((s) => s.setRoom);
  const setPlayers = useRoomStore((s) => s.setPlayers);
  const setMyPlayerId = useRoomStore((s) => s.setMyPlayerId);
  const roomStoreStatus = useRoomStore((s) => s.status);
  const roomId = useRoomStore((s) => s.roomId);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const code = params.code.toUpperCase();

  useEffect(() => {
    if (!isReady) return;
    if (!session || session.roomCode !== code) {
      router.replace(`/?code=${code}`);
    }
  }, [isReady, session, code, router]);

  useEffect(() => {
    if (!isReady || !session || session.roomCode !== code) return;

    let cancelled = false;
    const supabase = getSupabaseBrowserClient();

    async function loadRoom(): Promise<RoomApiResponse | null> {
      try {
        const res = await fetch(`/api/rooms/${code}`);
        if (!res.ok) {
          if (!cancelled) setNotFound(true);
          return null;
        }
        const data: RoomApiResponse = await res.json();
        if (cancelled) return null;

        setRoom({
          roomId: data.room.id,
          roomCode: data.room.code,
          hostId: data.room.hostId,
          status: data.room.status,
          maxPlayers: data.room.maxPlayers,
          botCount: data.room.botCount,
        });
        setPlayers(
          data.players.map((p) => ({
            id: p.id,
            userId: p.userId,
            name: p.name,
            isBot: p.isBot,
            seat: p.seat,
            isConnected: p.isConnected,
          })),
        );
        setMyPlayerId(session!.playerId);
        setLoading(false);
        return data;
      } catch {
        if (!cancelled) setNotFound(true);
        return null;
      }
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;

    loadRoom().then((data) => {
      if (cancelled || !data) return;
      channel = supabase
        .channel(`lobby:${data.room.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${data.room.id}` },
          () => void loadRoom(),
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'rooms', filter: `id=eq.${data.room.id}` },
          () => void loadRoom(),
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [isReady, session, code, setRoom, setPlayers, setMyPlayerId]);

  if (notFound) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="text-lg text-slate-300">Room not found.</p>
        <button onClick={() => router.push('/')} className="text-blue-400 hover:underline">
          Back to home
        </button>
      </div>
    );
  }

  if (loading || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if ((roomStoreStatus === 'playing' || roomStoreStatus === 'finished') && roomId) {
    return <GameBoard roomId={roomId} playerId={session.playerId} />;
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <RoomLobby />
    </div>
  );
}
