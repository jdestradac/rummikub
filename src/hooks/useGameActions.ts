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

  const dispatch = useCallback(
    async (action: PlayerAction): Promise<boolean> => {
      if (!roomId || !playerId) return false;
      setSubmitting(true);
      setError(null);

      try {
        const res = await fetch('/api/game/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId, playerId, action }),
        });
        const data: ActionResponse = await res.json();

        if (data.publicState) hydratePublicState(data.publicState);
        if (data.myRack) setMyRack(data.myRack);

        if (!data.success) {
          const message = data.error ?? 'That arrangement is not valid.';
          setError(message);
          toast.error(message);
        } else if (
          action.type === 'PLACE_TILE' ||
          action.type === 'MOVE_TILE' ||
          action.type === 'CREATE_GROUP' ||
          action.type === 'SPLIT_GROUP'
        ) {
          setHasPlacedThisTurn(true);
        } else if (action.type === 'UNDO_TURN') {
          setHasPlacedThisTurn(false);
        }

        return data.success;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error — please try again.';
        setError(message);
        toast.error(message);
        return false;
      } finally {
        setSubmitting(false);
      }
    },
    [roomId, playerId, setSubmitting, setError, hydratePublicState, setMyRack, setHasPlacedThisTurn],
  );

  const placeTile = useCallback(
    (tileId: string, groupId: string, position: number) =>
      dispatch({ type: 'PLACE_TILE', tileId, groupId, position }),
    [dispatch],
  );

  const moveTile = useCallback(
    (tileId: string, fromGroupId: string, toGroupId: string, position: number) =>
      dispatch({ type: 'MOVE_TILE', tileId, fromGroupId, toGroupId, position }),
    [dispatch],
  );

  const returnTileToRack = useCallback(
    (tileId: string, fromGroupId: string) =>
      dispatch({ type: 'MOVE_TILE', tileId, fromGroupId, toGroupId: RACK_SENTINEL, position: 0 }),
    [dispatch],
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
      toast.success('Turn confirmed!');
    }
    return ok;
  }, [dispatch, selectTile]);

  const undoTurn = useCallback(() => dispatch({ type: 'UNDO_TURN' }), [dispatch]);

  const drawTile = useCallback(async (): Promise<boolean> => {
    if (!roomId || !playerId) return false;
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/game/draw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, playerId }),
      });
      const data: ActionResponse = await res.json();

      if (data.publicState) hydratePublicState(data.publicState);
      if (data.myRack) setMyRack(data.myRack);

      if (!data.success) {
        const message = data.error ?? 'Could not draw a tile.';
        setError(message);
        toast.error(message);
      } else {
        toast.info('You drew a tile.');
      }

      return data.success;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Network error — please try again.';
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
