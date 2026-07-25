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
  const optimisticPlaceFromRack = useGameStore((s) => s.optimisticPlaceFromRack);
  const optimisticMoveOnBoard = useGameStore((s) => s.optimisticMoveOnBoard);
  const optimisticUndo = useGameStore((s) => s.optimisticUndo);
  const optimisticAdvanceTurnForDraw = useGameStore((s) => s.optimisticAdvanceTurnForDraw);

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
    [roomId, playerId, setSubmitting, setError, hydratePublicState, setMyRack],
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

  // Instant: snap board/rack back to how they were at the start of this
  // turn (already tracked locally), then confirm with the server in the
  // background — no reason to make the player wait on a round-trip just to
  // see their own moves disappear.
  const undoTurn = useCallback(() => {
    optimisticUndo();
    dispatchOptimistic({ type: 'UNDO_TURN' });
  }, [dispatchOptimistic, optimisticUndo]);

  // Instant: we already know whose turn is next and can decrement the pile
  // count locally, so the turn hands off immediately. The actual drawn
  // tile pops into the rack a moment later once the response arrives (that
  // part can't be predicted client-side — the pile is shuffled).
  const drawTile = useCallback(() => {
    if (!roomId || !playerId) return;
    optimisticAdvanceTurnForDraw();
    const requestedAt = Date.now();

    fetch('/api/game/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId, playerId }),
    })
      .then((res) => res.json())
      .then((data: ActionResponse) => {
        if (data.publicState) hydratePublicState(data.publicState, requestedAt);
        if (data.myRack) setMyRack(data.myRack, requestedAt);

        if (!data.success) {
          toast.error(data.error ?? 'No se pudo robar una ficha.');
        }
      })
      .catch(() => {
        toast.error('Error de red — reintenta si el turno no avanzó.');
      });
  }, [roomId, playerId, hydratePublicState, setMyRack, optimisticAdvanceTurnForDraw]);

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
