'use client';

import { AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/gameStore';
import { TileGroupComponent } from './TileGroup';
import { DropZone } from './DropZone';
import { generateGroupId } from '@/core/board';

export function Board() {
  const board = useGameStore((s) => s.board);
  const phase = useGameStore((s) => s.phase);

  // A fresh id per render so a successful drop always targets a brand-new
  // server-side group rather than reusing a stale one.
  const newGroupId = generateGroupId();

  return (
    <div className="felt-texture relative flex h-full w-full flex-col gap-4 overflow-y-auto rounded-2xl border-4 border-[#123625] p-4 shadow-[inset_0_2px_12px_rgba(0,0,0,0.4)]">
      {board.length === 0 && phase === 'playing' && (
        <div className="flex flex-1 items-center justify-center">
          <DropZone
            id="board-empty"
            data={{ type: 'board-new', groupId: newGroupId }}
            className="flex h-32 w-64 flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-white/25 text-center text-sm text-white/60"
          >
            <span className="text-2xl">🀄</span>
            Arrastra fichas aquí para armar un juego o escalera
          </DropZone>
        </div>
      )}

      <div className="flex flex-wrap content-start gap-3">
        <AnimatePresence>
          {board.map((group) => (
            <TileGroupComponent key={group.id} group={group} interactive={phase === 'playing'} />
          ))}
        </AnimatePresence>
      </div>

      {board.length > 0 && phase === 'playing' && (
        <DropZone
          id="board-open-space"
          data={{ type: 'board-new', groupId: newGroupId }}
          className="min-h-[80px] flex-1 rounded-xl border border-dashed border-white/10 transition-colors"
        />
      )}
    </div>
  );
}
