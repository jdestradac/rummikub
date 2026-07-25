'use client';

import { useEffect } from 'react';
import { DndContext, DragOverlay } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { Board } from './Board/Board';
import { PlayerRack } from './Rack/PlayerRack';
import { OpponentRack } from './Rack/OpponentRack';
import { ActionBar } from './ActionBar/ActionBar';
import { Scoreboard } from './Scoreboard/Scoreboard';
import { GameLog } from './GameLog/GameLog';
import { GameOverModal } from './GameOver/GameOverModal';
import { Tile } from './Tile/Tile';
import { useGameStore } from '@/store/gameStore';
import { useRoomStore } from '@/store/roomStore';
import { useRealtimeGame } from '@/hooks/useRealtimeGame';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';

interface GameBoardProps {
  roomId: string;
  playerId: string;
}

export function GameBoard({ roomId, playerId }: GameBoardProps) {
  const init = useGameStore((s) => s.init);
  const myRack = useGameStore((s) => s.myRack);
  const board = useGameStore((s) => s.board);
  const players = useGameStore((s) => s.players);
  const currentTurn = useGameStore((s) => s.currentTurn);
  const botThinking = useGameStore((s) => s.botThinking);
  const hostId = useRoomStore((s) => s.hostId);
  const roomPlayers = useRoomStore((s) => s.players);

  const hydratePublicState = useGameStore((s) => s.hydratePublicState);
  const setMyRack = useGameStore((s) => s.setMyRack);
  const hostPlayerId = roomPlayers.find((p) => p.userId === hostId)?.id ?? null;

  useEffect(() => {
    init(roomId, playerId);
  }, [roomId, playerId, init]);

  // Realtime broadcasts only reach clients already subscribed when they
  // fire, so pull the current state once on mount to cover fresh loads /
  // reconnects mid-game.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/game/state?roomId=${roomId}&playerId=${playerId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        hydratePublicState(data.publicState);
        setMyRack(data.myRack);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [roomId, playerId, hydratePublicState, setMyRack]);

  useRealtimeGame(roomId, playerId);

  const { sensors, activeTileId, handleDragStart, handleDragEnd, handleDragCancel } = useDragAndDrop(
    roomId,
    playerId,
  );

  const activeTile = activeTileId
    ? [...myRack, ...board.flatMap((g) => g.tiles)].find((t) => t.id === activeTileId)
    : null;

  const opponents = players.filter((p) => p.id !== playerId).sort((a, b) => a.seat - b.seat);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex h-full min-h-screen w-full flex-col bg-app-bg lg:flex-row">
        <div className="flex flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-app-border bg-app-surface/60 px-4 py-2">
            <div className="flex flex-wrap gap-2">
              {opponents.map((p) => (
                <OpponentRack key={p.id} player={p} isCurrentTurn={p.seat === currentTurn} />
              ))}
            </div>
            {botThinking && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="whitespace-nowrap text-sm text-amber-400"
              >
                Bot thinking…
              </motion.span>
            )}
          </div>

          <div className="min-h-[50vh] flex-1 p-3">
            <Board />
          </div>

          <PlayerRack />
          <ActionBar roomId={roomId} playerId={playerId} />
        </div>

        <aside className="flex w-full flex-col gap-3 border-t border-app-border bg-app-bg p-3 lg:w-80 lg:border-l lg:border-t-0">
          <Scoreboard />
          <div className="min-h-[200px] flex-1">
            <GameLog />
          </div>
        </aside>
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTile ? <Tile tile={activeTile} size="md" /> : null}
      </DragOverlay>

      <GameOverModal roomId={roomId} hostPlayerId={hostPlayerId} myPlayerId={playerId} />
    </DndContext>
  );
}
