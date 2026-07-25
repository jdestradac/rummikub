'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tile } from '@/components/game/Tile/Tile';
import { DropZone } from '@/components/game/Board/DropZone';
import { useGameStore, sortRack, rackClusterKey } from '@/store/gameStore';
import { cn } from '@/lib/cn';

const TILE_TRANSITION = { duration: 0.16, ease: 'easeOut' } as const;

export function PlayerRack() {
  const rack = useGameStore((s) => s.myRack);
  const rackSort = useGameStore((s) => s.rackSort);
  const setRackSort = useGameStore((s) => s.setRackSort);
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectTile = useGameStore((s) => s.selectTile);
  const players = useGameStore((s) => s.players);
  const myPlayerId = useGameStore((s) => s.myPlayerId);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const phase = useGameStore((s) => s.phase);

  const me = players.find((p) => p.id === myPlayerId);
  const isMyTurn = phase === 'playing' && me?.seat === currentTurn;

  const sorted = useMemo(() => sortRack(rack, rackSort), [rack, rackSort]);

  return (
    <div
      className={cn(
        'sticky bottom-0 left-0 right-0 z-10 border-t border-app-border bg-app-bg/95 px-4 py-3 backdrop-blur',
        isMyTurn && 'shadow-tile-selected',
      )}
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="flex flex-col items-center gap-1 text-xs text-slate-400">
          <span
            className={cn(
              'rounded-full px-2.5 py-1 font-mono font-semibold tabular-nums',
              isMyTurn ? 'bg-amber-400 text-slate-900' : 'bg-app-surface',
            )}
          >
            {rack.length}
          </span>
          <span>fichas</span>
        </div>

        <DropZone
          id="player-rack"
          data={{ type: 'rack' }}
          className={cn(
            'flex flex-1 items-center gap-1 overflow-x-auto rounded-lg border p-2 transition-colors',
            isMyTurn ? 'border-amber-400/50 animate-pulse-border' : 'border-app-border',
          )}
        >
          {sorted.length === 0 && (
            <span className="px-2 text-sm text-slate-500">Tu atril está vacío — ¡ganaste!</span>
          )}
          <AnimatePresence initial={false}>
            {sorted.map((tile, index) => {
              const isNewCluster = index > 0 && rackClusterKey(tile, rackSort) !== rackClusterKey(sorted[index - 1]!, rackSort);
              return (
                <motion.div
                  key={tile.id}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.9 }}
                  transition={TILE_TRANSITION}
                  className={cn(isNewCluster && 'ml-2.5')}
                >
                  <Tile
                    tile={tile}
                    draggable={isMyTurn}
                    selected={selectedTileId === tile.id}
                    dragData={{ type: 'rack', tileId: tile.id }}
                    onClick={() => isMyTurn && selectTile(selectedTileId === tile.id ? null : tile.id)}
                  />
                </motion.div>
              );
            })}
          </AnimatePresence>
        </DropZone>

        <div className="flex flex-col gap-1 text-xs">
          <button
            onClick={() => setRackSort('color')}
            className={cn(
              'rounded-md px-2.5 py-1 font-medium transition-colors',
              rackSort === 'color' ? 'bg-blue-600 text-white' : 'bg-app-surface text-slate-400 hover:text-slate-200',
            )}
          >
            Color
          </button>
          <button
            onClick={() => setRackSort('number')}
            className={cn(
              'rounded-md px-2.5 py-1 font-medium transition-colors',
              rackSort === 'number' ? 'bg-blue-600 text-white' : 'bg-app-surface text-slate-400 hover:text-slate-200',
            )}
          >
            Número
          </button>
        </div>
      </div>
    </div>
  );
}
