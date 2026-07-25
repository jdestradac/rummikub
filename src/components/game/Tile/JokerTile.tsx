'use client';

import { motion } from 'framer-motion';
import type { Tile as TileType } from '@/core/types';
import { cn } from '@/lib/cn';

interface JokerTileProps {
  tile: TileType;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  isDragging?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const SIZE_CLASS = {
  sm: 'h-11 w-8 text-lg',
  md: 'h-16 w-11 text-2xl',
  lg: 'h-20 w-14 text-3xl',
};

/**
 * Purely presentational — dragging (ref/attributes/listeners/transform) is
 * owned entirely by the wrapper in Tile.tsx, which also renders this. Never
 * add @dnd-kit's transform here alongside Framer Motion's animate/whileHover:
 * both write the `transform` CSS property and fighting over it is what made
 * dragging unreliable for some tiles before this split.
 */
export function JokerTile({ tile, selected, size = 'md', isDragging, disabled, onClick }: JokerTileProps) {
  const label =
    tile.representsColor && tile.representsNumber != null
      ? `Joker — representing ${tile.representsColor} ${tile.representsNumber}`
      : 'Joker';

  return (
    <motion.button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex select-none items-center justify-center rounded-lg font-black shadow-tile transition-opacity',
        'bg-gradient-to-br from-amber-200 via-tile-joker to-amber-600 text-amber-900',
        SIZE_CLASS[size],
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && !isDragging && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40 shadow-tile-dragging',
        selected && !isDragging && 'shadow-tile-selected animate-pulse-border',
      )}
      animate={{ y: selected && !isDragging ? -5 : 0, scale: isDragging ? 1.1 : 1 }}
      whileHover={!disabled && !isDragging ? { y: -2 } : undefined}
      transition={{ duration: 0.12, ease: 'easeOut' }}
    >
      ★
    </motion.button>
  );
}
