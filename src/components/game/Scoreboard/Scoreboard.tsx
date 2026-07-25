'use client';

import { useGameStore } from '@/store/gameStore';
import { PlayerRow } from './PlayerRow';

export function Scoreboard() {
  const players = useGameStore((s) => s.players);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const drawPileCount = useGameStore((s) => s.drawPileCount);

  const sorted = [...players].sort((a, b) => a.seat - b.seat);

  return (
    <div className="flex h-full flex-col gap-3 rounded-xl border border-app-border bg-app-surface p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Puntuación</h3>
        <span className="rounded bg-app-bg px-2 py-1 font-mono text-xs text-slate-300">
          Mazo: {drawPileCount}
        </span>
      </div>
      <ul className="flex flex-col gap-1.5">
        {sorted.map((p) => (
          <PlayerRow key={p.id} player={p} isCurrentTurn={p.seat === currentTurn} isMe={p.id === myPlayerId} />
        ))}
      </ul>
    </div>
  );
}
