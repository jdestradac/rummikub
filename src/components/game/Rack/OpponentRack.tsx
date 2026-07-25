import type { PublicPlayer } from '@/core/types';
import { cn } from '@/lib/cn';

interface OpponentRackProps {
  player: PublicPlayer;
  isCurrentTurn: boolean;
}

export function OpponentRack({ player, isCurrentTurn }: OpponentRackProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border px-3 py-2 transition-opacity',
        isCurrentTurn ? 'border-amber-400/60 bg-amber-400/5' : 'border-app-border opacity-60',
      )}
    >
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          player.isConnected ? 'bg-emerald-400' : 'bg-slate-600',
        )}
      />
      <span className="flex-1 truncate text-sm font-medium text-slate-200">
        {player.name}
        {player.isBot && <span className="ml-1 text-xs text-slate-500">(bot)</span>}
      </span>
      <div className="flex -space-x-2" aria-hidden>
        {Array.from({ length: Math.min(player.tileCount, 6) }).map((_, i) => (
          <div key={i} className="h-6 w-4 rounded-sm bg-tile-bg shadow-tile" />
        ))}
        {player.tileCount > 6 && <span className="ml-2 text-xs text-slate-400">+{player.tileCount - 6}</span>}
      </div>
    </div>
  );
}
