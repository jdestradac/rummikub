'use client';

import { useCallback, useState } from 'react';
import {
  useSensor,
  useSensors,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useGameActions } from './useGameActions';
import { useGameStore } from '@/store/gameStore';

export type DragSource =
  | { type: 'rack'; tileId: string }
  | { type: 'board'; tileId: string; groupId: string };

export type DropTarget =
  | { type: 'board-group'; groupId: string; position: number }
  | { type: 'board-new'; groupId: string }
  | { type: 'rack' };

/**
 * Wires @dnd-kit sensors + drag lifecycle to the game-action dispatchers.
 * Drag item `data` is expected to carry a `DragSource`; drop target `data`
 * a `DropTarget` (set via `useDroppable({ data })` / `useDraggable({ data })`
 * in the Tile / DropZone components).
 */
export function useDragAndDrop(roomId: string | null, playerId: string | null) {
  const { placeTile, moveTile, returnTileToRack } = useGameActions(roomId, playerId);
  const [activeTileId, setActiveTileId] = useState<string | null>(null);
  const selectTile = useGameStore((s) => s.selectTile);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const source = event.active.data.current as DragSource | undefined;
    if (source) setActiveTileId(source.tileId);
  }, []);

  const handleDragCancel = useCallback(() => {
    setActiveTileId(null);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveTileId(null);
      const source = event.active.data.current as DragSource | undefined;
      const target = event.over?.data.current as DropTarget | undefined;
      if (!source || !target) return;

      selectTile(null);

      if (target.type === 'rack') {
        if (source.type === 'board') {
          void returnTileToRack(source.tileId, source.groupId);
        }
        return;
      }

      if (target.type === 'board-new') {
        if (source.type === 'rack') {
          void placeTile(source.tileId, target.groupId, 0);
        } else {
          void moveTile(source.tileId, source.groupId, target.groupId, 0);
        }
        return;
      }

      // target.type === 'board-group'
      if (source.type === 'rack') {
        void placeTile(source.tileId, target.groupId, target.position);
      } else {
        void moveTile(source.tileId, source.groupId, target.groupId, target.position);
      }
    },
    [placeTile, moveTile, returnTileToRack, selectTile],
  );

  return { sensors, activeTileId, handleDragStart, handleDragEnd, handleDragCancel };
}
