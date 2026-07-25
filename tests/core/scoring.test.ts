import { describe, expect, it } from 'vitest';
import type { Tile } from '@/core/types';
import { rackValue, tileValue, calculateFinalScores } from '@/core/scoring';

function tile(color: Tile['color'], number: number | null, extra: Partial<Tile> = {}): Tile {
  return {
    id: `${color}-${number}-${Math.random()}`,
    color,
    number,
    isJoker: color === 'joker',
    ...extra,
  };
}

describe('rackValue / tileValue', () => {
  it('sums normal tile numbers correctly', () => {
    const tiles = [tile('red', 4), tile('blue', 10), tile('black', 13)];
    expect(rackValue(tiles)).toBe(27);
  });

  it('values a joker with a known representation as that tile value', () => {
    const j = tile('joker', null, { isJoker: true, representsColor: 'red', representsNumber: 12 });
    expect(tileValue(j)).toBe(12);
  });

  it('values an unassigned joker as 30', () => {
    const j = tile('joker', null, { isJoker: true });
    expect(tileValue(j)).toBe(30);
  });
});

describe('calculateFinalScores', () => {
  it('awards the winner the sum of everyone else\'s remaining tiles, and debits each loser their own', () => {
    const players = [
      { id: 'p1', name: 'Winner', rack: [] as Tile[] },
      { id: 'p2', name: 'Loser A', rack: [tile('red', 5), tile('blue', 10)] },
      { id: 'p3', name: 'Loser B', rack: [tile('black', 3)] },
    ];

    const scores = calculateFinalScores(players, 'p1');
    const byId = Object.fromEntries(scores.map((s) => [s.playerId, s.score]));

    expect(byId.p2).toBe(-15);
    expect(byId.p3).toBe(-3);
    expect(byId.p1).toBe(18);
  });
});
