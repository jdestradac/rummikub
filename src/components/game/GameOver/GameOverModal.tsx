'use client';

import { useRouter } from 'next/navigation';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useGameStore } from '@/store/gameStore';
import { toast } from '@/store/toastStore';

interface GameOverModalProps {
  roomId: string | null;
  hostPlayerId: string | null;
  myPlayerId: string | null;
}

export function GameOverModal({ roomId, hostPlayerId, myPlayerId }: GameOverModalProps) {
  const router = useRouter();
  const phase = useGameStore((s) => s.phase);
  const winnerId = useGameStore((s) => s.winnerId);
  const players = useGameStore((s) => s.players);
  const finalScores = useGameStore((s) => s.finalScores);

  const winner = players.find((p) => p.id === winnerId);
  const isHost = hostPlayerId === myPlayerId;

  async function handlePlayAgain() {
    if (!roomId) return;
    try {
      const res = await fetch('/api/game/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, hostPlayerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to restart the game.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to restart the game.');
    }
  }

  const scores = finalScores ?? players.map((p) => ({ playerId: p.id, playerName: p.name, score: p.score }));
  const sortedScores = [...scores].sort((a, b) => b.score - a.score);

  return (
    <Modal open={phase === 'finished'} dismissible={false} title="Game over">
      <div className="flex flex-col gap-4">
        <p className="text-center text-lg">
          <span className="font-bold text-amber-400">{winner?.name ?? 'Someone'}</span> wins! 🎉
        </p>

        <ul className="flex flex-col gap-1.5">
          {sortedScores.map((s) => (
            <li
              key={s.playerId}
              className="flex items-center justify-between rounded-lg bg-app-bg px-3 py-2 text-sm"
            >
              <span className="text-slate-200">{s.playerName}</span>
              <span className={s.score >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                {s.score >= 0 ? '+' : ''}
                {s.score}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex gap-3">
          {isHost && (
            <Button variant="success" className="flex-1" onClick={handlePlayAgain}>
              Play again
            </Button>
          )}
          <Button variant="secondary" className="flex-1" onClick={() => router.push('/')}>
            Leave
          </Button>
        </div>
      </div>
    </Modal>
  );
}
