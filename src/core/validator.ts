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
 * Infers what number each joker in `tiles` stands for, purely from its
 * position within a *valid* set or run (e.g. a joker sitting between a red 6
 * and a red 8 is a red 7). Returns `undefined` per-tile when `tiles` isn't a
 * valid group, or when there's no non-joker tile to anchor the inference to.
 */
function inferJokerNumbers(tiles: Tile[]): (number | undefined)[] {
  if (isValidSet(tiles)) {
    const setNumber = tiles.find((t) => !t.isJoker)?.number ?? undefined;
    return tiles.map(() => setNumber);
  }

  if (isValidRun(tiles)) {
    const anchorIndex = tiles.findIndex((t) => !t.isJoker);
    if (anchorIndex === -1) return tiles.map(() => undefined);
    const anchorNumber = tiles[anchorIndex]!.number as number;
    return tiles.map((_, i) => anchorNumber + (i - anchorIndex));
  }

  return tiles.map(() => undefined);
}

/**
 * Sum of tile numbers. Per official Rummikub scoring rules, a joker that is
 * part of a valid meld counts as the number/color it stands in for there
 * (e.g. filling a gap in a run of 7s counts as 7) — the flat 30-point value
 * only applies to a joker that's still unplayed in a player's rack. This
 * function infers the contextual value automatically when `tiles` forms a
 * valid set/run, and otherwise falls back to an explicit `representsNumber`
 * or the 30-point default (correct for scoring an un-melded rack).
 */
export function calculateGroupValue(tiles: Tile[]): number {
  const inferred = inferJokerNumbers(tiles);
  return tiles.reduce((sum, tile, index) => {
    if (tile.isJoker) {
      return sum + (tile.representsNumber ?? inferred[index] ?? UNKNOWN_JOKER_VALUE);
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

/**
 * Returns a copy of `tiles` with every joker's `representsColor` /
 * `representsNumber` filled in from context, when the group is a valid set
 * or run. Used to persist joker identity once a board group is confirmed,
 * so the UI can show what each joker stands for.
 */
export function resolveJokerIdentities(tiles: Tile[]): Tile[] {
  const isSet = isValidSet(tiles);
  const isRun = !isSet && isValidRun(tiles);
  if (!isSet && !isRun) return tiles;

  const inferredNumbers = inferJokerNumbers(tiles);
  const runColor = isRun ? (tiles.find((t) => !t.isJoker)?.color as TileColor) : undefined;
  const usedColors = new Set(tiles.filter((t) => !t.isJoker).map((t) => t.color as TileColor));
  const missingColors = TILE_COLORS.filter((c) => !usedColors.has(c));
  let missingColorIndex = 0;

  return tiles.map((tile, index) => {
    if (!tile.isJoker) return tile;
    const representsNumber = inferredNumbers[index];
    if (representsNumber === undefined) return tile;

    if (isSet) {
      const representsColor = missingColors[missingColorIndex];
      missingColorIndex += 1;
      return { ...tile, representsColor, representsNumber };
    }

    return { ...tile, representsColor: runColor, representsNumber };
  });
}

/** Applies {@link resolveJokerIdentities} to every group on the board. */
export function resolveBoardJokerIdentities(groups: TileGroup[]): TileGroup[] {
  return groups.map((g) => ({ ...g, tiles: resolveJokerIdentities(g.tiles) }));
}
