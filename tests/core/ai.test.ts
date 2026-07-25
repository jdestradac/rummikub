import { describe, expect, it } from 'vitest';
import type { Tile, TileGroup } from '@/core/types';
import { computeBotMove } from '@/core/ai';

function tile(color: Tile['color'], number: number | null, id?: string): Tile {
  return {
    id: id ?? `${color}-${number}-${Math.random().toString(36).slice(2, 6)}`,
    color,
    number,
    isJoker: color === 'joker',
  };
}

describe('computeBotMove', () => {
  it('finds a valid set when one clearly exists in the rack', () => {
    const rack = [tile('red', 7), tile('blue', 7), tile('black', 7), tile('orange', 2)];
    const move = computeBotMove(rack, [], true);

    expect(move.shouldDraw).toBe(false);
    expect(move.newGroups.length).toBeGreaterThan(0);
    const playedNumbers = move.newGroups[0]!.tiles.map((t) => t.number).sort();
    expect(playedNumbers).toEqual([7, 7, 7]);
  });

  it('extends an existing board run with a rack tile', () => {
    const board: TileGroup[] = [
      { id: 'g1', type: 'run', tiles: [tile('blue', 4), tile('blue', 5), tile('blue', 6)] },
    ];
    const rack = [tile('blue', 7), tile('red', 1)];

    const move = computeBotMove(rack, board, true);

    expect(move.shouldDraw).toBe(false);
    expect(move.boardExtensions.length).toBe(1);
    expect(move.boardExtensions[0]!.groupId).toBe('g1');
    expect(move.boardExtensions[0]!.tiles.map((t) => t.number)).toContain(7);
  });

  it('returns shouldDraw: true when no valid move exists', () => {
    const rack = [tile('red', 1), tile('blue', 3), tile('black', 9), tile('orange', 11)];
    const move = computeBotMove(rack, [], true);

    expect(move.shouldDraw).toBe(true);
    expect(move.newGroups).toHaveLength(0);
    expect(move.boardExtensions).toHaveLength(0);
  });

  it('will not open (play new groups) before reaching the 30-point threshold', () => {
    const rack = [tile('red', 2), tile('blue', 2), tile('black', 2)]; // set worth only 6
    const move = computeBotMove(rack, [], false);

    expect(move.shouldDraw).toBe(true);
    expect(move.newGroups).toHaveLength(0);
  });
});
