'use client';

import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { useDraggable } from '@dnd-kit/core';
import type { Tile as TileType, TileColor } from '@/core/types';
import type { DragSource } from '@/hooks/useDragAndDrop';
import { cn } from '@/lib/cn';
import { JokerTile } from './JokerTile';

export interface TileProps {
  tile: TileType;
  draggable?: boolean;
  selected?: boolean;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  dragData?: DragSource;
  onClick?: (tile: TileType) => void;
}

const COLOR_TEXT_CLASS: Record<TileColor, string> = {
  red: 'text-tile-red',
  blue: 'text-tile-blue',
  black: 'text-tile-black',
  orange: 'text-tile-orange',
};

const SIZE_CLASS = {
  sm: 'h-11 w-8 text-base',
  md: 'h-16 w-11 text-2xl',
  lg: 'h-20 w-14 text-3xl',
};

export function Tile({
  tile,
  draggable = false,
  selected = false,
  disabled = false,
  size = 'md',
  dragData,
  onClick,
}: TileProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `tile-${tile.id}-${dragData?.type ?? 'static'}`,
    data: dragData,
    disabled: !draggable || disabled,
  });

  // @dnd-kit owns this wrapper's `transform` exclusively. It must never be
  // mixed with Framer Motion's own `animate`/`whileHover` on the *same*
  // element — both systems write the CSS `transform` property, and they
  // silently fight over it depending on each tile's animation history
  // (selected vs. not, hovered vs. not), which made dragging flaky for
  // some tiles but not others. Framer Motion's animations live one level
  // down, on a plain (non-dnd) inner element instead.
  const dragWrapperStyle: CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    touchAction: draggable ? 'none' : undefined,
    WebkitTouchCallout: 'none',
    zIndex: isDragging ? 50 : undefined,
  };

  const content = tile.isJoker ? (
    <JokerTile
      tile={tile}
      selected={selected}
      size={size}
      isDragging={isDragging}
      disabled={disabled}
      onClick={() => onClick?.(tile)}
    />
  ) : (
    <motion.button
      type="button"
      onClick={() => onClick?.(tile)}
      disabled={disabled}
      className={cn(
        'relative flex select-none items-center justify-center rounded-lg bg-gradient-to-b from-white via-tile-bg to-[#f2e6d6] font-black shadow-tile transition-opacity',
        SIZE_CLASS[size],
        disabled && 'cursor-not-allowed opacity-50',
        !disabled && draggable && 'cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-40 shadow-tile-dragging',
        selected && !isDragging && 'shadow-tile-selected animate-pulse-border',
      )}
      animate={{ y: selected && !isDragging ? -5 : 0, scale: isDragging ? 1.1 : 1 }}
      whileHover={!disabled && draggable && !isDragging ? { y: -2 } : undefined}
      transition={{ duration: 0.12, ease: 'easeOut' }}
    >
      <span className={cn(COLOR_TEXT_CLASS[tile.color as TileColor], 'leading-none drop-shadow-sm')}>
        {tile.number}
      </span>
    </motion.button>
  );

  return (
    <div
      ref={draggable ? setNodeRef : undefined}
      style={dragWrapperStyle}
      {...(draggable ? attributes : {})}
      {...(draggable ? listeners : {})}
    >
      {content}
    </div>
  );
}
