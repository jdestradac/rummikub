import type { PublicPlayer } from '@/core/types';
import { cn } from '@/lib/cn';

interface PlayerRowProps {
  player: PublicPlayer;
  isCurrentTurn: boolean;
  isMe: boolean;
}

export function PlayerRow({ player, isCurrentTurn, isMe }: PlayerRowProps) {
  return (
    <li
      className={cn(
        'flex items-center gap-2 rounded-lg px-3 py-2 text-sm',
        isCurrentTurn ? 'bg-amber-400/10 ring-1 ring-amber-400/50' : 'bg-app-bg',
      )}
    >
      <span className={cn('h-2 w-2 rounded-full', player.isConnected ? 'bg-emerald-400' : 'bg-slate-600')} />
      <span className={cn('flex-1 truncate font-medium', isMe ? 'text-blue-300' : 'text-slate-200')}>
        {player.name}
        {isMe && ' (you)'}
      </span>
      {player.hasOpened && <span className="text-xs text-emerald-400" title="Opened">✓</span>}
      <span className="font-mono text-xs text-slate-400">{player.tileCount} tiles</span>
      <span className="w-10 text-right font-mono text-sm text-slate-100">{player.score}</span>
    </li>
  );
}
