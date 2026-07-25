'use client';

import { useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { toast } from '@/store/toastStore';
import type { PlayerAction, PublicGameState, Tile } from '@/core/types';
import { RACK_SENTINEL } from '@/core/gameEngine';

interface ActionResponse {
  success: boolean;
  error?: string;
  publicState?: PublicGameState;
  myRack?: Tile[];
}

export { RACK_SENTINEL };

export function useGameActions(roomId: string | null, playerId: string | null) {
  const setSubmitting = useGameStore((s) => s.setSubmitting);
  const setError = useGameStore((s) => s.setError);
  const hydratePublicState = useGameStore((s) => s.hydratePublicState);
  const setMyRack = useGameStore((s) => s.setMyRack);
  const selectTile = useGameStore((s) => s.selectTile);
  const setHasPlacedThisTurn = useGameStore((s) => s.setHasPlacedThisTurn);
  const optimisticPlaceFromRack = useGameStore((s) => s.optimisticPlaceFromRack);
  const optimisticMoveOnBoard = useGameStore((s) => s.optimisticMoveOnBoard);

  /**
   * Sends an action to the server and reconciles the store with the
   * (authoritative) response once it arrives. Blocking: sets `isSubmitting`
   * so callers can show a spinner / disable buttons while it's in flight.
   * Use this for once-per-turn actions (confirm/undo/draw) where waiting is
   * expected and fine.
   */
  const dispatch = useCallback(
    async (action: PlayerAction): Promise<boolean> => {
      if (!roomId || !playerId) return false;
      setSubmitting(true);
      setError(null);
      const requestedAt = Date.now();

      try {
        const res = await fetch('/api/game/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, playerId, action }),
        });
        const data: ActionResponse = await res.json();

        if (data.publicState) hydratePublicState(data.publicState, requestedAt);
        if (data.myRack) setMyRack(data.myRack, requestedAt);

        if (!data.success) {
          const message = data.error ?? 'Ese arreglo no es válido.';
          setError(message);
          toast.error(message);
        } else if (action.type === 'UNDO_TURN') {
          setHasPlacedThisTurn(false);
        }

        return data.success;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error de red — intenta de nuevo.';
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [roomId, playerId, setSubmitting, setError, hydratePublicState, setMyRack, setHasPlacedThisTurn],
  );

  /**
   * Fire-and-reconcile for drag/drop tile manipulation: the optimistic
   * mutation already updated the board/rack synchronously (before this is
   * called), so this just sends the request in the background and corrects
   * the store if the server disagrees — no blocking spinner, since the
   * whole point is that dragging a tile should feel instant instead of
   * waiting on a network round-trip.
   */
  const dispatchOptimistic = useCallback(
    (action: PlayerAction) => {
      if (!roomId || !playerId) return;
      const requestedAt = Date.now();

      fetch('/api/game/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerId, action }),
      })
        .then((res) => res.json())
        .then((data: ActionResponse) => {
          if (data.publicState) hydratePublicState(data.publicState, requestedAt);
          if (data.myRack) setMyRack(data.myRack, requestedAt);

          if (!data.success) {
            const message = data.error ?? 'Ese arreglo no es válido.';
            toast.error(message);
          }
        })
        .catch(() => {
          toast.error('Error de red — tu jugada podría no haberse guardado. Reintenta si algo se ve raro.');
        });
    },
    [roomId, playerId, hydratePublicState, setMyRack],
  );

  const placeTile = useCallback(
    (tileId: string, groupId: string, position: number) => {
      optimisticPlaceFromRack(tileId, groupId, position);
      dispatchOptimistic({ type: 'PLACE_TILE', tileId, groupId, position });
    },
    [dispatchOptimistic, optimisticPlaceFromRack],
  );

  const moveTile = useCallback(
    (tileId: string, fromGroupId: string, toGroupId: string, position: number) => {
      optimisticMoveOnBoard(tileId, fromGroupId, toGroupId, position);
      dispatchOptimistic({ type: 'MOVE_TILE', tileId, fromGroupId, toGroupId, position });
    },
    [dispatchOptimistic, optimisticMoveOnBoard],
  );

  const returnTileToRack = useCallback(
    (tileId: string, fromGroupId: string) => {
      optimisticMoveOnBoard(tileId, fromGroupId, RACK_SENTINEL, 0);
      dispatchOptimistic({ type: 'MOVE_TILE', tileId, fromGroupId, toGroupId: RACK_SENTINEL, position: 0 });
    },
    [dispatchOptimistic, optimisticMoveOnBoard],
  );

  const createGroup = useCallback(
    (tileIds: string[]) => dispatch({ type: 'CREATE_GROUP', tileIds }),
    [dispatch],
  );

  const splitGroup = useCallback(
    (groupId: string, splitAt: number) => dispatch({ type: 'SPLIT_GROUP', groupId, splitAt }),
    [dispatch],
  );

  const confirmTurn = useCallback(async () => {
    const ok = await dispatch({ type: 'CONFIRM_TURN' });
    if (ok) {
      selectTile(null);
      toast.success('¡Turno confirmado!');
    }
    return ok;
  }, [dispatch, selectTile]);

  const undoTurn = useCallback(() => dispatch({ type: 'UNDO_TURN' }), [dispatch]);

  const drawTile = useCallback(async (): Promise<boolean> => {
    if (!roomId || !playerId) return false;
    setSubmitting(true);
    setError(null);
    const requestedAt = Date.now();

    try {
      const res = await fetch('/api/game/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerId }),
      });
      const data: ActionResponse = await res.json();

      if (data.publicState) hydratePublicState(data.publicState, requestedAt);
      if (data.myRack) setMyRack(data.myRack, requestedAt);

      if (!data.success) {
        const message = data.error ?? 'No se pudo robar una ficha.';
        setError(message);
        toast.error(message);
      } else {
        toast.info('Robaste una ficha.');
      }

      return data.success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error de red — intenta de nuevo.';
      setError(message);
      toast.error(message);
      return false;
    } finally {
      setSubmitting(false);
    }
  }, [roomId, playerId, hydratePublicState, setMyRack, setSubmitting, setError]);

  return {
    placeTile,
    moveTile,
    returnTileToRack,
    createGroup,
    splitGroup,
    confirmTurn,
    undoTurn,
    drawTile,
  };
}
