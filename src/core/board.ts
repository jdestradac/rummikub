import type { Tile, TileGroup } from './types';
import { groupType } from './validator';

let groupCounter = 0;

/** Deterministic-ish unique id generator for freshly created board groups. */
export function generateGroupId(): string {
  groupCounter += 1;
  return `group-${Date.now()}-${groupCounter}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneBoard(board: TileGroup[]): TileGroup[] {
  return board.map((g) => ({ ...g, tiles: [...g.tiles] }));
}

export function createGroup(tiles: Tile[], id: string = generateGroupId()): TileGroup {
  return { id, tiles: [...tiles], type: groupType(tiles) };
}

export function findGroupById(board: TileGroup[], groupId: string): TileGroup | undefined {
  return board.find((g) => g.id === groupId);
}

export function findTileInBoard(
  board: TileGroup[],
  tileId: string,
): { group: TileGroup; index: number } | null {
  for (const group of board) {
    const index = group.tiles.findIndex((t) => t.id === tileId);
    if (index !== -1) return { group, index };
  }
  return null;
}

/** Replaces a group in-place by id, or removes it entirely if `newGroup` is null. */
export function replaceGroup(board: TileGroup[], groupId: string, newGroup: TileGroup | null): TileGroup[] {
  const next = board.filter((g) => g.id !== groupId);
  if (newGroup && newGroup.tiles.length > 0) {
    const index = board.findIndex((g) => g.id === groupId);
    if (index === -1) {
      next.push(newGroup);
    } else {
      next.splice(index, 0, newGroup);
    }
  }
  return next;
}

export function removeEmptyGroups(board: TileGroup[]): TileGroup[] {
  return board.filter((g) => g.tiles.length > 0);
}

/** Inserts `tile` into `group` at `position` (clamped to valid range), recomputing its type. */
export function addTileToGroup(group: TileGroup, tile: Tile, position: number): TileGroup {
  const tiles = [...group.tiles];
  const clamped = Math.max(0, Math.min(position, tiles.length));
  tiles.splice(clamped, 0, tile);
  return { ...group, tiles, type: groupType(tiles) };
}

/** Removes a tile by id from a group, recomputing its type. */
export function removeTileFromGroup(group: TileGroup, tileId: string): { group: TileGroup; tile: Tile | null } {
  const index = group.tiles.findIndex((t) => t.id === tileId);
  if (index === -1) return { group, tile: null };
  const tiles = [...group.tiles];
  const [tile] = tiles.splice(index, 1);
  return { group: { ...group, tiles, type: groupType(tiles) }, tile: tile ?? null };
}

/** Splits a group into two groups at `splitAt` (tiles before/after the index). */
export function splitGroup(group: TileGroup, splitAt: number): [TileGroup, TileGroup] {
  const left = group.tiles.slice(0, splitAt);
  const right = group.tiles.slice(splitAt);
  return [createGroup(left), createGroup(right)];
}

export function boardTileCount(board: TileGroup[]): number {
  return board.reduce((sum, g) => sum + g.tiles.length, 0);
}

export function allBoardTileIds(board: TileGroup[]): Set<string> {
  const ids = new Set<string>();
  for (const group of board) {
    for (const tile of group.tiles) ids.add(tile.id);
  }
  return ids;
}
