'use client';

import { Button } from '@/components/ui/Button';
import { useGameStore } from '@/store/gameStore';
import { validateBoard } from '@/core/validator';
import { useGameActions } from '@/hooks/useGameActions';

export function ConfirmButton({ roomId, playerId }: { roomId: string | null; playerId: string | null }) {
  const board = useGameStore((s) => s.board);
  const hasPlacedThisTurn = useGameStore((s) => s.hasPlacedThisTurn);
  const isSubmitting = useGameStore((s) => s.isSubmitting);
  const { confirmTurn } = useGameActions(roomId, playerId);

  const validation = validateBoard(board);
  const disabled = !hasPlacedThisTurn || isSubmitting;

  return (
    <div className="flex flex-col items-center gap-1">
      <Button variant="success" size="lg" disabled={disabled} loading={isSubmitting} onClick={() => confirmTurn()}>
        ✓ Confirmar turno
      </Button>
      {hasPlacedThisTurn && !validation.valid && (
        <span className="text-xs text-red-400">El tablero aún no es válido</span>
      )}
    </div>
  );
}
