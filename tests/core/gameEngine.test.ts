import { describe, expect, it } from 'vitest';
import type { ServerGameState, Tile } from '@/core/types';
import { applyAction } from '@/core/gameEngine';

function tile(color: Tile['color'], number: number | null, id: string): Tile {
  return { id, color, number, isJoker: false };
}

function baseState(overrides: Partial<ServerGameState> = {}): ServerGameState {
  return {
    roomId: 'room-1',
    phase: 'playing',
    currentTurn: 0,
    board: [],
    drawPile: [
      tile('red', 1, 'draw-1'),
      tile('red', 2, 'draw-2'),
      tile('red', 3, 'draw-3'),
      tile('red', 4, 'draw-4'),
      tile('red', 5, 'draw-5'),
    ],
    racks: {},
    turnSnapshot: null,
    players: [
      { id: 'p1', name: 'Alice', isBot: false, seat: 0, hasOpened: true, score: 0, isConnected: true },
      { id: 'p2', name: 'Bob', isBot: false, seat: 1, hasOpened: true, score: 0, isConnected: true },
    ],
    winnerId: null,
    ...overrides,
  };
}

describe('applyAction - CONFIRM_TURN', () => {
  it('fails and adds 3 penalty tiles when the board arrangement is invalid', () => {
    const originalRack = [
      tile('red', 1, 't1'),
      tile('blue', 5, 't2'),
      tile('black', 9, 't3'),
      tile('orange', 11, 't4'),
    ];

    const state = baseState({
      racks: { p1: [originalRack[3]!], p2: [] },
      board: [{ id: 'bad-group', type: 'unknown', tiles: [originalRack[0]!, originalRack[1]!, originalRack[2]!] }],
      turnSnapshot: { board: [], rack: originalRack },
    });

    const result = applyAction(state, { type: 'CONFIRM_TURN' }, 'p1');

    expect(result.success).toBe(false);
    expect(result.newState.board).toEqual([]);
    expect(result.newState.racks.p1).toHaveLength(originalRack.length + 3);
    expect(result.newState.currentTurn).toBe(1);
  });

  it('advances the turn to the next player after a successful confirm', () => {
    const rack = [tile('red', 7, 'r7'), tile('blue', 7, 'b7'), tile('black', 7, 'k7'), tile('orange', 2, 'o2')];

    const state = baseState({
      racks: { p1: [rack[3]!], p2: [] },
      board: [{ id: 'new-set', type: 'set', tiles: [rack[0]!, rack[1]!, rack[2]!] }],
      turnSnapshot: { board: [], rack },
    });

    const result = applyAction(state, { type: 'CONFIRM_TURN' }, 'p1');

    expect(result.success).toBe(true);
    expect(result.newState.currentTurn).toBe(1);
    expect(result.newState.phase).toBe('playing');
  });

  it('detects the win condition when the confirming player empties their rack', () => {
    const rack = [tile('red', 7, 'r7'), tile('blue', 7, 'b7'), tile('black', 7, 'k7')];

    const state = baseState({
      racks: { p1: [], p2: [] },
      board: [{ id: 'new-set', type: 'set', tiles: rack }],
      turnSnapshot: { board: [], rack },
    });

    const result = applyAction(state, { type: 'CONFIRM_TURN' }, 'p1');

    expect(result.success).toBe(true);
    expect(result.newState.phase).toBe('finished');
    expect(result.newState.winnerId).toBe('p1');
  });
});
