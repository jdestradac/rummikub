import type { Tile, TileColor, TileGroup, ValidationResult } from './types';
import { MAX_NUMBER, MIN_NUMBER, TILE_COLORS } from './deck';

const OPENING_THRESHOLD = 30;
const UNKNOWN_JOKER_VALUE = 30;

/**
 * Valid set: 3-4 tiles, same number, all different colors (no duplicate
 * colors). Jokers count as any missing color for that number.
 */
export function isValidSet(tiles: Tile[]): boolean {
  if (tiles.length < 3 || tiles.length > 4) return false;

  const nonJokers = tiles.filter((t) => !t.isJoker);
  const jokers = tiles.filter((t) => t.isJoker);

  if (nonJokers.length === 0) return false; // can't determine the number

  const number = nonJokers[0]!.number;
  if (number === null) return false;
  if (!nonJokers.every((t) => t.number === number)) return false;

  const colors = nonJokers.map((t) => t.color as TileColor);
  const uniqueColors = new Set(colors);
  if (uniqueColors.size !== colors.length) return false; // duplicate color

  // total distinct "color slots" used (real colors + jokers) must equal the
  // tile count and can't exceed the 4 available colors.
  return uniqueColors.size + jokers.length === tiles.length && uniqueColors.size + jokers.length <= 4;
}

/**
 * Valid run: 3+ tiles, same color, consecutive numbers 1-13. Jokers fill
 * gaps or extend either end. Runs cannot wrap around (13 -> 1 is invalid).
 */
export function isValidRun(tiles: Tile[]): boolean {
  if (tiles.length < 3) return false;

  const nonJokers = tiles.filter((t) => !t.isJoker);
  const jokers = tiles.filter((t) => t.isJoker);

  if (nonJokers.length === 0) return false; // can't determine color/position

  const color = nonJokers[0]!.color;
  if (color === 'joker') return false;
  if (!nonJokers.every((t) => t.color === color)) return false;

  const numbers = nonJokers.map((t) => t.number);
  if (numbers.some((n) => n === null || n < MIN_NUMBER || n > MAX_NUMBER)) return false;

  const numSet = new Set(numbers);
  if (numSet.size !== numbers.length) return false; // duplicate number, same color

  const sorted = [...numSet].sort((a, b) => (a as number) - (b as number)) as number[];
  const minNum = sorted[0]!;
  const maxNum = sorted[sorted.length - 1]!;

  const internalGapSlots = maxNum - minNum + 1 - sorted.length;
  if (internalGapSlots > jokers.length) return false;

  const remainingJokers = jokers.length - internalGapSlots;
  const roomLeft = minNum - MIN_NUMBER;
  const roomRight = MAX_NUMBER - maxNum;

  // The leftover jokers must be placeable on the ends without going out of
  // the 1-13 range; any split between left/right works as long as there is
  // combined room for all of them.
  return remainingJokers <= roomLeft + roomRight;
}

export function isValidGroup(tiles: Tile[]): boolean {
  return isValidSet(tiles) || isValidRun(tiles);
}

export function groupType(tiles: Tile[]): TileGroup['type'] {
  if (isValidSet(tiles)) return 'set';
  if (isValidRun(tiles)) return 'run';
  return 'unknown';
}

export function validateBoard(groups: TileGroup[]): ValidationResult {
  const invalidGroupIds: string[] = [];
  const errors: string[] = [];

  for (const group of groups) {
    if (group.tiles.length === 0) continue;
    if (!isValidGroup(group.tiles)) {
      invalidGroupIds.push(group.id);
      errors.push(`Group ${group.id} is not a valid set or run.`);
    }
  }

  return {
    valid: invalidGroupIds.length === 0,
    invalidGroupIds,
    errors,
  };
}

/**
 * Sum of tile numbers; a joker counts as the value of the tile it
 * represents, or 30 if unassigned/unknown.
 */
export function calculateGroupValue(tiles: Tile[]): number {
  return tiles.reduce((sum, tile) => {
    if (tile.isJoker) {
      return sum + (tile.representsNumber ?? UNKNOWN_JOKER_VALUE);
    }
    return sum + (tile.number ?? 0);
  }, 0);
}

/**
 * Returns true if the combined value of the newly placed groups is >= 30
 * and every one of those groups is a valid set or run (the standard
 * Rummikub "opening" requirement).
 */
export function canOpenWith(groups: TileGroup[]): boolean {
  if (groups.length === 0) return false;

  const allValid = groups.every((g) => isValidGroup(g.tiles));
  if (!allValid) return false;

  const total = groups.reduce((sum, g) => sum + calculateGroupValue(g.tiles), 0);
  return total >= OPENING_THRESHOLD;
}

export function allColors(): TileColor[] {
  return [...TILE_COLORS];
}
