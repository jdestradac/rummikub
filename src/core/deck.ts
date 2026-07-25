import type { Tile, TileColor } from './types';

export const TILE_COLORS: TileColor[] = ['red', 'blue', 'black', 'orange'];
export const MIN_NUMBER = 1;
export const MAX_NUMBER = 13;
export const TILES_PER_PLAYER = 14;
export const JOKER_COUNT = 2;

/**
 * Builds a fresh, unshuffled 106-tile Rummikub deck: two copies of every
 * number 1-13 in each of the four colors, plus two jokers.
 */
export function createDeck(): Tile[] {
  const tiles: Tile[] = [];

  for (const color of TILE_COLORS) {
    for (let number = MIN_NUMBER; number <= MAX_NUMBER; number++) {
      for (let copy = 1; copy <= 2; copy++) {
        tiles.push({
          id: `${color}-${number}-${copy}`,
          color,
          number,
          isJoker: false,
        });
      }
    }
  }

  for (let i = 1; i <= JOKER_COUNT; i++) {
    tiles.push({
      id: `joker-${i}`,
      color: 'joker',
      number: null,
      isJoker: true,
    });
  }

  return tiles;
}

/** Fisher-Yates shuffle. Returns a new array; does not mutate the input. */
export function shuffleDeck<T>(deck: T[]): T[] {
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = result[i]!;
    result[i] = result[j]!;
    result[j] = temp;
  }
  return result;
}

/**
 * Deals `tilesPerPlayer` tiles to each of `playerCount` players from the top
 * of `deck` (in order). Returns the hands plus whatever remains as the draw
 * pile.
 */
export function dealTiles(
  deck: Tile[],
  playerCount: number,
  tilesPerPlayer: number = TILES_PER_PLAYER,
): { hands: Tile[][]; drawPile: Tile[] } {
  const remaining = [...deck];
  const hands: Tile[][] = Array.from({ length: playerCount }, () => []);

  for (let i = 0; i < playerCount; i++) {
    for (let j = 0; j < tilesPerPlayer; j++) {
      const tile = remaining.shift();
      if (tile) hands[i]!.push(tile);
    }
  }

  return { hands, drawPile: remaining };
}

export function createShuffledDeck(): Tile[] {
  return shuffleDeck(createDeck());
}
