import { describe, expect, it } from 'vitest';
import type { Tile } from '@/core/types';
import { isValidSet, isValidRun, isValidGroup, calculateGroupValue, canOpenWith } from '@/core/validator';

function tile(color: Tile['color'], number: number | null, id?: string): Tile {
  return {
    id: id ?? `${color}-${number}-${Math.random()}`,
    color,
    number,
    isJoker: color === 'joker',
  };
}

function joker(id = 'joker-1'): Tile {
  return { id, color: 'joker', number: null, isJoker: true };
}

describe('isValidSet', () => {
  it('accepts a valid set of 3 (same number, distinct colors)', () => {
    const tiles = [tile('red', 7), tile('blue', 7), tile('black', 7)];
    expect(isValidSet(tiles)).toBe(true);
  });

  it('accepts a valid set of 4', () => {
    const tiles = [tile('red', 9), tile('blue', 9), tile('black', 9), tile('orange', 9)];
    expect(isValidSet(tiles)).toBe(true);
  });

  it('rejects a set with a duplicate color', () => {
    const tiles = [tile('red', 5), tile('red', 5, 'red-5-2'), tile('blue', 5)];
    expect(isValidSet(tiles)).toBe(false);
  });

  it('rejects a set with the wrong tile count', () => {
    expect(isValidSet([tile('red', 5), tile('blue', 5)])).toBe(false);
    expect(isValidSet([tile('red', 5), tile('blue', 5), tile('black', 5), tile('orange', 5), joker()])).toBe(
      false,
    );
  });

  it('allows a joker to stand in for any missing color', () => {
    const tiles = [tile('red', 8), tile('blue', 8), joker()];
    expect(isValidSet(tiles)).toBe(true);
  });
});

describe('isValidRun', () => {
  it('accepts an ascending run of the same color', () => {
    const tiles = [tile('blue', 4), tile('blue', 5), tile('blue', 6)];
    expect(isValidRun(tiles)).toBe(true);
  });

  it('accepts a run with a joker filling an internal gap', () => {
    const tiles = [tile('red', 4), joker(), tile('red', 6)];
    expect(isValidRun(tiles)).toBe(true);
  });

  it('rejects non-consecutive numbers', () => {
    const tiles = [tile('blue', 4), tile('blue', 5), tile('blue', 9)];
    expect(isValidRun(tiles)).toBe(false);
  });

  it('rejects mixed colors', () => {
    const tiles = [tile('blue', 4), tile('red', 5), tile('blue', 6)];
    expect(isValidRun(tiles)).toBe(false);
  });

  it('rejects wraparound (13 -> 1)', () => {
    const tiles = [tile('black', 12), tile('black', 13), tile('black', 1)];
    expect(isValidRun(tiles)).toBe(false);
  });

  it('accepts a joker as the run endpoint', () => {
    const tiles = [joker(), tile('orange', 2), tile('orange', 3)];
    expect(isValidRun(tiles)).toBe(true);
  });

  it('accepts a joker as a mid-point of the run', () => {
    const tiles = [tile('orange', 1), joker(), tile('orange', 3)];
    expect(isValidRun(tiles)).toBe(true);
  });
});

describe('isValidGroup', () => {
  it('returns true for a valid set or run, false otherwise', () => {
    expect(isValidGroup([tile('red', 7), tile('blue', 7), tile('black', 7)])).toBe(true);
    expect(isValidGroup([tile('blue', 4), tile('blue', 5), tile('blue', 6)])).toBe(true);
    expect(isValidGroup([tile('blue', 4), tile('red', 9)])).toBe(false);
  });
});

describe('calculateGroupValue / canOpenWith', () => {
  it('sums tile numbers for a group', () => {
    expect(calculateGroupValue([tile('red', 7), tile('blue', 7), tile('black', 7)])).toBe(21);
  });

  it('values an unassigned joker inside a valid set as the set number, not the flat 30', () => {
    const tiles = [tile('red', 7), tile('blue', 7), joker()];
    expect(calculateGroupValue(tiles)).toBe(21); // 7 + 7 + 7, not 7 + 7 + 30
  });

  it('values an unassigned joker inside a valid run by its gap position', () => {
    const tiles = [tile('orange', 5), joker(), tile('orange', 7)];
    expect(calculateGroupValue(tiles)).toBe(18); // 5 + 6 + 7, not 5 + 30 + 7
  });

  it('still falls back to 30 for a joker with no group context (e.g. sitting alone in a rack)', () => {
    expect(calculateGroupValue([joker()])).toBe(30);
  });

  it('rejects an opening meld under 30 points', () => {
    const group = { id: 'g1', type: 'set' as const, tiles: [tile('red', 3), tile('blue', 3), tile('black', 3)] };
    expect(canOpenWith([group])).toBe(false);
  });

  it('accepts an opening meld at or above 30 points across groups', () => {
    const group1 = {
      id: 'g1',
      type: 'set' as const,
      tiles: [tile('red', 10), tile('blue', 10), tile('black', 10)],
    };
    const group2 = { id: 'g2', type: 'run' as const, tiles: [tile('orange', 1), tile('orange', 2), tile('orange', 3)] };
    expect(canOpenWith([group1, group2])).toBe(true);
  });
});
