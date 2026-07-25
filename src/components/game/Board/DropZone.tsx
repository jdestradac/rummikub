'use client';

import type { ReactNode } from 'react';
import { useDroppable } from '@dnd-kit/core';
import type { DropTarget } from '@/hooks/useDragAndDrop';
import { cn } from '@/lib/cn';

interface DropZoneProps {
  id: string;
  data: DropTarget;
  children?: ReactNode;
  className?: string;
  activeClassName?: string;
}

export function DropZone({ id, data, children, className, activeClassName }: DropZoneProps) {
  const { setNodeRef, isOver } = useDroppable({ id, data });

  return (
    <div
      ref={setNodeRef}
      className={cn(className, isOver && (activeClassName ?? 'ring-2 ring-amber-400/80 bg-amber-400/10'))}
    >
      {children}
    </div>
  );
}
