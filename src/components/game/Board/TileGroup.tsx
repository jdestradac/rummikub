'use client';

import { motion } from 'framer-motion';
import type { TileGroup as TileGroupType } from '@/core/types';
import { Tile } from '@/components/game/Tile/Tile';
import { isValidGroup } from '@/core/validator';
import { cn } from '@/lib/cn';
import { DropZone } from './DropZone';
import { useGameStore } from '@/store/gameStore';

interface TileGroupProps {
  group: TileGroupType;
  interactive?: boolean;
}

export function TileGroupComponent({ group, interactive = true }: TileGroupProps) {
  const selectedTileId = useGameStore((s) => s.selectedTileId);
  const selectTile = useGameStore((s) => s.selectTile);
  const valid = group.tiles.length === 0 || isValidGroup(group.tiles);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className={cn(
        'flex items-center gap-0.5 rounded-xl border bg-white/10 p-2 backdrop-blur-sm',
        valid ? 'border-white/10' : 'border-red-500/70 animate-shake',
      )}
    >
      {interactive && (
        <DropZone
          id={`${group.id}-pos-0`}
          data={{ type: 'board-group', groupId: group.id, position: 0 }}
          className="w-1.5 self-stretch rounded"
        />
      )}
      {group.tiles.map((tile, index) => (
        <div key={tile.id} className="flex items-center gap-0.5">
          <Tile
            tile={tile}
            size="md"
            draggable={interactive}
            selected={selectedTileId === tile.id}
            dragData={{ type: 'board', tileId: tile.id, groupId: group.id }}
            onClick={() => interactive && selectTile(selectedTileId === tile.id ? null : tile.id)}
          />
          {interactive && (
            <DropZone
              id={`${group.id}-pos-${index + 1}`}
              data={{ type: 'board-group', groupId: group.id, position: index + 1 }}
              className="w-1.5 self-stretch rounded"
            />
          )}
        </div>
      ))}
    </motion.div>
  );
}
