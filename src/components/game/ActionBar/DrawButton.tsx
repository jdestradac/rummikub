'use client';

import { Button } from '@/components/ui/Button';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';

export function DrawButton({ roomId, playerId }: { roomId: string | null; playerId: string | null }) {
  const hasPlacedThisTurn = useGameStore((s) => s.hasPlacedThisTurn);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const drawPileCount = useGameStore((s) => s.drawPileCount);
  const { drawTile } = useGameActions(roomId, playerId);

  return (
    <Button
      variant="secondary"
      size="lg"
      disabled={hasPlacedThisTurn || isSubmitting || drawPileCount === 0}
      loading={isSubmitting}
      onClick={() => drawTile()}
    >
      Draw tile
      <span className="ml-1 rounded bg-black/20 px-1.5 py-0.5 text-xs font-mono">{drawPileCount}</span>
    </Button>
  );
}
