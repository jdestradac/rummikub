'use client';

import { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Tile } from '@/components/game/Tile/Tile';
import { DropZone } from '@/components/game/Board/DropZone';
import { useGameStore, sortRack } from '@/store/gameStore';
import { cn } from '@/lib/cn';

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
          <span className="rounded-full bg-app-surface px-2 py-1 font-mono">{rack.length}</span>
          <span>tiles</span>
        </div>

        <DropZone
          id="player-rack"
          data={{ type: 'rack' }}
          className={cn(
            'flex flex-1 gap-1.5 overflow-x-auto rounded-lg border p-2',
            isMyTurn ? 'border-amber-400/50 animate-pulse-border' : 'border-app-border',
          )}
        >
          <AnimatePresence initial={false}>
            {sorted.map((tile) => (
              <motion.div
                key={tile.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
              >
                <Tile
                  tile={tile}
                  draggable={isMyTurn}
                  selected={selectedTileId === tile.id}
                  dragData={{ type: 'rack', tileId: tile.id }}
                  onClick={() => isMyTurn && selectTile(selectedTileId === tile.id ? null : tile.id)}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </DropZone>

        <div className="flex flex-col gap-1">
          <button
            onClick={() => setRackSort('color')}
            className={cn(
              'rounded px-2 py-1 text-xs',
              rackSort === 'color' ? 'bg-blue-600 text-white' : 'bg-app-surface text-slate-400',
            )}
          >
            Color
          </button>
          <button
            onClick={() => setRackSort('number')}
            className={cn(
              'rounded px-2 py-1 text-xs',
              rackSort === 'number' ? 'bg-blue-600 text-white' : 'bg-app-surface text-slate-400',
            )}
          >
            Number
          </button>
        </div>
      </div>
    </div>
  );
}
