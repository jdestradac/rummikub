'use client';

import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import type { DraggableAttributes, DraggableSyntheticListeners } from '@dnd-kit/core';
import type { Tile as TileType } from '@/core/types';
import { cn } from '@/lib/cn';

interface JokerTileProps {
  tile: TileType;
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  draggable?: boolean;
  setNodeRef?: (node: HTMLElement | null) => void;
  style?: CSSProperties;
  attributes?: DraggableAttributes;
  listeners?: DraggableSyntheticListeners;
  isDragging?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

const SIZE_CLASS = {
  sm: 'h-11 w-8 text-lg',
  md: 'h-16 w-11 text-2xl',
  lg: 'h-20 w-14 text-3xl',
};

export function JokerTile({
  tile,
  selected,
  size = 'md',
  draggable,
  setNodeRef,
  style,
  attributes,
  listeners,
  isDragging,
  disabled,
  onClick,
}: JokerTileProps) {
  const label =
    tile.representsColor && tile.representsNumber != null
      ? `Joker — representing ${tile.representsColor} ${tile.representsNumber}`
      : 'Joker';

  return (
    <motion.button
      ref={setNodeRef}
      type="button"
      title={label}
      aria-label={label}
      style={style}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex select-none items-center justify-center rounded-lg font-black shadow-tile transition-opacity',
        'bg-gradient-to-br from-amber-200 via-tile-joker to-amber-600 text-amber-900',
        SIZE_CLASS[size],
        draggable && 'touch-none',
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && setNodeRef && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40 shadow-tile-dragging',
        selected && !isDragging && 'shadow-tile-selected animate-pulse-border',
      )}
      animate={selected && !isDragging ? { y: -5 } : { y: 0 }}
      whileHover={!disabled && setNodeRef && !isDragging ? { y: -2 } : undefined}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      {...(attributes ?? {})}
      {...(listeners ?? {})}
    >
      ★
    </motion.button>
  );
}
