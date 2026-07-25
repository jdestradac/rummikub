'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import { useRoomStore, isHost } from '@/store/roomStore';
import { toast } from '@/store/toastStore';
import { MAX_BOTS, MIN_PLAYERS } from '@/lib/constants';

const AVATAR_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500'];

function avatarColor(seat: number): string {
  return AVATAR_COLORS[seat % AVATAR_COLORS.length]!;
}

export function RoomLobby() {
  const router = useRouter();
  const room = useRoomStore();
  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);
  const [updatingBots, setUpdatingBots] = useState(false);

  const host = isHost(room);
  const totalPlayers = room.players.length;
  const canStart = totalPlayers >= MIN_PLAYERS && totalPlayers <= room.maxPlayers;

  const shareLink = useMemo(() => {
    if (typeof window === 'undefined' || !room.roomCode) return '';
    return `${window.location.origin}/?code=${room.roomCode}`;
  }, [room.roomCode]);

  const humanCount = room.players.filter((p) => !p.isBot).length;
  const maxBots = Math.min(MAX_BOTS, room.maxPlayers - humanCount);

  const handleCopy = useCallback(async () => {
    if (!room.roomCode) return;
    await navigator.clipboard.writeText(room.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [room.roomCode]);

  const handleCopyLink = useCallback(async () => {
    await navigator.clipboard.writeText(shareLink);
    toast.success('Invite link copied!');
  }, [shareLink]);

  const setBotCount = useCallback(
    async (count: number) => {
      if (!room.roomCode) return;
      setUpdatingBots(true);
      try {
        const res = await fetch(`/api/rooms/${room.roomCode}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ botCount: count, hostId: room.myPlayerId }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? 'Failed to update bots.');
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to update bots.');
      } finally {
        setUpdatingBots(false);
      }
    },
    [room.roomCode, room.myPlayerId],
  );

  const handleStart = useCallback(async () => {
    if (!room.roomCode) return;
    setStarting(true);
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId: room.roomId, hostPlayerId: room.myPlayerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to start game.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to start game.');
      setStarting(false);
    }
  }, [room.roomId, room.roomCode, room.myPlayerId]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 p-4">
      <div className="rounded-2xl border border-app-border bg-app-surface p-6 text-center">
        <p className="mb-2 text-sm uppercase tracking-wide text-slate-400">Room code</p>
        <button
          onClick={handleCopy}
          className="mx-auto flex items-center gap-3 rounded-lg bg-app-bg px-6 py-3 font-mono text-4xl font-bold tracking-[0.3em] text-slate-100 transition hover:bg-slate-800"
        >
          {room.roomCode}
          <span className="text-sm font-sans font-normal text-slate-400">{copied ? 'Copied!' : 'Copy'}</span>
        </button>
        <button onClick={handleCopyLink} className="mt-3 text-sm text-blue-400 hover:underline">
          Copy invite link
        </button>
      </div>

      <div className="rounded-2xl border border-app-border bg-app-surface p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-400">
          Players ({totalPlayers}/{room.maxPlayers})
        </h3>
        <ul className="flex flex-col gap-2">
          {room.players.map((p) => (
            <motion.li
              key={p.id}
              layout
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 rounded-lg bg-app-bg px-3 py-2"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full font-bold text-white ${avatarColor(p.seat)}`}
              >
                {p.name.charAt(0).toUpperCase()}
              </span>
              <span className="flex-1 font-medium text-slate-100">{p.name}</span>
              {p.isBot && (
                <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-300">BOT</span>
              )}
              <span
                className={`h-2.5 w-2.5 rounded-full ${p.isConnected ? 'bg-emerald-400' : 'bg-slate-600'}`}
                title={p.isConnected ? 'Online' : 'Offline'}
              />
            </motion.li>
          ))}
        </ul>

        {host && (
          <div className="mt-5 flex items-center justify-between gap-4 border-t border-app-border pt-4">
            <span className="text-sm text-slate-300">Bots</span>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                disabled={updatingBots || room.botCount <= 0}
                onClick={() => setBotCount(room.botCount - 1)}
              >
                -
              </Button>
              <span className="w-6 text-center font-mono">{room.botCount}</span>
              <Button
                size="sm"
                variant="secondary"
                disabled={updatingBots || room.botCount >= maxBots}
                onClick={() => setBotCount(room.botCount + 1)}
              >
                +
              </Button>
            </div>
          </div>
        )}
      </div>

      {host ? (
        <Button size="lg" onClick={handleStart} loading={starting} disabled={!canStart}>
          {canStart ? 'Start game' : `Need at least ${MIN_PLAYERS} players`}
        </Button>
      ) : (
        <p className="text-center text-sm text-slate-400">Waiting for the host to start the game…</p>
      )}

      <button
        onClick={() => router.push('/')}
        className="text-center text-sm text-slate-500 hover:text-slate-300"
      >
        Leave room
      </button>
    </div>
  );
}
