import type { Tile, Score } from './types';
import { calculateGroupValue } from './validator';

const UNKNOWN_JOKER_VALUE = 30;

export function tileValue(tile: Tile): number {
  if (tile.isJoker) return tile.representsNumber ?? UNKNOWN_JOKER_VALUE;
  return tile.number ?? 0;
}

export function rackValue(tiles: Tile[]): number {
  return calculateGroupValue(tiles);
}

export interface ScoringPlayer {
  id: string;
  name: string;
  rack: Tile[];
}

/**
 * Classic Rummikub end-of-round scoring: the winner (empty rack) gains the
 * sum of every other player's remaining tile values; everyone else loses
 * the value of their own remaining tiles.
 */
export function calculateFinalScores(players: ScoringPlayer[], winnerId: string): Score[] {
  const rackValues = new Map(players.map((p) => [p.id, rackValue(p.rack)]));
  const totalRemaining = [...rackValues.entries()]
    .filter(([id]) => id !== winnerId)
    .reduce((sum, [, value]) => sum + value, 0);

  return players.map((p) => ({
    playerId: p.id,
    playerName: p.name,
    score: p.id === winnerId ? totalRemaining : -(rackValues.get(p.id) ?? 0),
  }));
}
