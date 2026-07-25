'use client';

import { useEffect } from 'react';
import { ConfirmButton } from './ConfirmButton';
import { UndoButton } from './UndoButton';
import { DrawButton } from './DrawButton';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';
import { KEYBOARD_SHORTCUTS } from '@/lib/constants';

interface ActionBarProps {
  roomId: string | null;
  playerId: string | null;
}

export function ActionBar({ roomId, playerId }: ActionBarProps) {
  const players = useGameStore((s) => s.players);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const phase = useGameStore((s) => s.phase);
  const selectTile = useGameStore((s) => s.selectTile);
  const rackSort = useGameStore((s) => s.rackSort);
  const setRackSort = useGameStore((s) => s.setRackSort);
  const { confirmTurn, undoTurn, drawTile } = useGameActions(roomId, playerId);

  const me = players.find((p) => p.id === playerId);
  const isMyTurn = phase === 'playing' && me?.seat === currentTurn;

  useEffect(() => {
    if (!isMyTurn) return;

    function handleKeydown(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;

      switch (e.key) {
        case KEYBOARD_SHORTCUTS.CONFIRM:
          e.preventDefault();
          void confirmTurn();
          break;
        case KEYBOARD_SHORTCUTS.DESELECT:
          selectTile(null);
          break;
        default:
          switch (e.key.toLowerCase()) {
            case KEYBOARD_SHORTCUTS.UNDO:
              void undoTurn();
              break;
            case KEYBOARD_SHORTCUTS.DRAW:
              void drawTile();
              break;
            case KEYBOARD_SHORTCUTS.SORT:
              setRackSort(rackSort === 'color' ? 'number' : 'color');
              break;
          }
      }
    }

    window.addEventListener('keydown', handleKeydown);
    return () => window.removeEventListener('keydown', handleKeydown);
  }, [isMyTurn, confirmTurn, undoTurn, drawTile, selectTile, rackSort, setRackSort]);

  if (!isMyTurn) {
    return (
      <div className="flex items-center justify-center gap-2 border-t border-app-border bg-app-surface/60 px-4 py-3 text-sm text-slate-400">
        <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        Esperando a {players.find((p) => p.seat === currentTurn)?.name ?? 'el siguiente jugador'}…
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3 border-t border-app-border bg-app-surface/60 px-4 py-3">
      <UndoButton roomId={roomId} playerId={playerId} />
      <DrawButton roomId={roomId} playerId={playerId} />
      <ConfirmButton roomId={roomId} playerId={playerId} />
    </div>
  );
}
