'use client';

import { Button } from '@/components/ui/Button';
import { useGameStore } from '@/store/gameStore';
import { useGameActions } from '@/hooks/useGameActions';

export function UndoButton({ roomId, playerId }: { roomId: string | null; playerId: string | null }) {
  const hasPlacedThisTurn = useGameStore((s) => s.hasPlacedThisTurn);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const { undoTurn } = useGameActions(roomId, playerId);

  return (
    <Button
      variant="warning"
      size="lg"
      disabled={!hasPlacedThisTurn || isSubmitting}
      loading={isSubmitting}
      onClick={() => undoTurn()}
    >
      Undo
    </Button>
  );
}
