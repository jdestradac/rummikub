import type { BoardExtension, BotMove, Tile, TileColor, TileGroup } from './types';
import { MAX_NUMBER, MIN_NUMBER, TILE_COLORS } from './deck';
import { calculateGroupValue, canOpenWith, isValidGroup } from './validator';
import { addTileToGroup, createGroup } from './board';

interface Candidate {
  tiles: Tile[];
}

/** Picks the first available (non-joker) tile of a given color from a pool, removing it. */
function takeByColor(pool: Tile[], color: TileColor, number: number): Tile | null {
  const index = pool.findIndex((t) => !t.isJoker && t.color === color && t.number === number);
  if (index === -1) return null;
  return pool.splice(index, 1)[0]!;
}

function takeJoker(pool: Tile[]): Tile | null {
  const index = pool.findIndex((t) => t.isJoker);
  if (index === -1) return null;
  return pool.splice(index, 1)[0]!;
}

/** Finds the largest valid SET candidate (3-4 tiles, one number, distinct colors + jokers). */
function bestSetCandidate(rack: Tile[]): Candidate | null {
  let best: Candidate | null = null;

  for (let number = MIN_NUMBER; number <= MAX_NUMBER; number++) {
    const colorsPresent = TILE_COLORS.filter((c) => rack.some((t) => !t.isJoker && t.color === c && t.number === number));
    const jokerCount = rack.filter((t) => t.isJoker).length;

    for (const size of [4, 3]) {
      if (colorsPresent.length + jokerCount < size) continue;
      const colorsUsed = colorsPresent.slice(0, Math.min(colorsPresent.length, size));
      const jokersNeeded = size - colorsUsed.length;
      if (jokersNeeded > jokerCount) continue;

      const pool = [...rack];
      const tiles: Tile[] = [];
      let ok = true;
      for (const color of colorsUsed) {
        const t = takeByColor(pool, color, number);
        if (!t) {
          ok = false;
          break;
        }
        tiles.push(t);
      }
      if (!ok) continue;

      const missingColors = TILE_COLORS.filter((c) => !colorsUsed.includes(c));
      for (let i = 0; i < jokersNeeded; i++) {
        const j = takeJoker(pool);
        if (!j) {
          ok = false;
          break;
        }
        tiles.push({ ...j, representsColor: missingColors[i], representsNumber: number });
      }
      if (!ok) continue;

      const candidate: Candidate = { tiles };
      if (!best || candidate.tiles.length > best.tiles.length) {
        best = candidate;
      }
      break; // only need the largest feasible size for this number
    }
  }

  return best;
}

/** Finds the largest valid RUN candidate (3+ tiles, one color, consecutive numbers). */
function bestRunCandidate(rack: Tile[]): Candidate | null {
  let best: Candidate | null = null;
  let bestLength = 0;

  for (const color of TILE_COLORS) {
    const numbersPresent = new Set<number>();
    for (const t of rack) {
      if (!t.isJoker && t.color === color && t.number !== null) numbersPresent.add(t.number);
    }
    const jokerCount = rack.filter((t) => t.isJoker).length;

    for (let lo = MIN_NUMBER; lo <= MAX_NUMBER; lo++) {
      for (let hi = lo + 2; hi <= MAX_NUMBER; hi++) {
        const length = hi - lo + 1;
        if (length <= bestLength) continue;

        let presentCount = 0;
        for (let n = lo; n <= hi; n++) if (numbersPresent.has(n)) presentCount++;
        const required = length - presentCount;
        if (presentCount === 0 || required > jokerCount) continue;

        const pool = [...rack];
        const tiles: Tile[] = [];
        let ok = true;
        for (let n = lo; n <= hi; n++) {
          if (numbersPresent.has(n)) {
            const t = takeByColor(pool, color, n);
            if (!t) {
              ok = false;
              break;
            }
            tiles.push(t);
          } else {
            const j = takeJoker(pool);
            if (!j) {
              ok = false;
              break;
            }
            tiles.push({ ...j, representsColor: color, representsNumber: n });
          }
        }
        if (!ok) continue;

        best = { tiles };
        bestLength = length;
      }
    }
  }

  return best;
}

function removeTilesFromRack(rack: Tile[], used: Tile[]): Tile[] {
  const usedIds = new Set(used.map((t) => t.id));
  return rack.filter((t) => !usedIds.has(t.id));
}

/** Greedily finds new groups (sets/runs) buildable purely from `rack`, largest-first. */
function findGreedyGroups(rack: Tile[]): TileGroup[] {
  let remaining = [...rack];
  const groups: TileGroup[] = [];

  // Cap iterations defensively; a rack has at most 14(+) tiles so this is
  // always a small number of passes.
  for (let i = 0; i < rack.length; i++) {
    const setCandidate = bestSetCandidate(remaining);
    const runCandidate = bestRunCandidate(remaining);

    let chosen: Candidate | null = null;
    if (setCandidate && runCandidate) {
      if (runCandidate.tiles.length !== setCandidate.tiles.length) {
        chosen = runCandidate.tiles.length > setCandidate.tiles.length ? runCandidate : setCandidate;
      } else {
        chosen = calculateGroupValue(runCandidate.tiles) >= calculateGroupValue(setCandidate.tiles) ? runCandidate : setCandidate;
      }
    } else {
      chosen = setCandidate ?? runCandidate;
    }

    if (!chosen) break;

    groups.push(createGroup(chosen.tiles));
    remaining = removeTilesFromRack(remaining, chosen.tiles);
  }

  return groups;
}

/** Tries to extend existing board groups (sets or runs) using leftover rack tiles. */
function extendBoardGroups(
  board: TileGroup[],
  rack: Tile[],
): { extensions: BoardExtension[]; usedTileIds: string[]; remaining: Tile[] } {
  let remaining = [...rack];
  const extensionMap = new Map<string, Tile[]>();
  const usedTileIds: string[] = [];

  let progress = true;
  while (progress) {
    progress = false;

    for (const group of board) {
      if (group.type === 'unknown') continue;

      const currentTiles = [...group.tiles, ...(extensionMap.get(group.id) ?? [])];

      for (const tile of remaining) {
        const appended = addTileToGroup({ ...group, tiles: currentTiles }, tile, currentTiles.length);
        const prepended = addTileToGroup({ ...group, tiles: currentTiles }, tile, 0);

        let resolvedTile: Tile | null = null;
        if (isValidGroup(appended.tiles) || isValidGroup(prepended.tiles)) {
          resolvedTile = resolveJokerForGroup(tile, group);
        }

        if (resolvedTile) {
          const list = extensionMap.get(group.id) ?? [];
          list.push(resolvedTile);
          extensionMap.set(group.id, list);
          usedTileIds.push(tile.id);
          remaining = remaining.filter((t) => t.id !== tile.id);
          progress = true;
          break;
        }
      }
    }
  }

  const extensions: BoardExtension[] = [...extensionMap.entries()].map(([groupId, tiles]) => ({
    groupId,
    tiles,
  }));

  return { extensions, usedTileIds, remaining };
}

function resolveJokerForGroup(tile: Tile, group: TileGroup): Tile {
  if (!tile.isJoker) return tile;
  if (group.type === 'run') {
    const color = group.tiles.find((t) => !t.isJoker)?.color as TileColor | undefined;
    const numbers = group.tiles.map((t) => (t.isJoker ? t.representsNumber : t.number)).filter((n): n is number => n !== null && n !== undefined);
    const min = Math.min(...numbers);
    const max = Math.max(...numbers);
    return { ...tile, representsColor: color, representsNumber: min - 1 >= MIN_NUMBER ? min - 1 : max + 1 };
  }
  const number = group.tiles.find((t) => !t.isJoker)?.number ?? group.tiles.find((t) => t.isJoker)?.representsNumber ?? null;
  const usedColors = new Set(group.tiles.map((t) => (t.isJoker ? t.representsColor : t.color)));
  const missingColor = TILE_COLORS.find((c) => !usedColors.has(c));
  return { ...tile, representsColor: missingColor, representsNumber: number ?? undefined };
}

/**
 * Computes a medium-difficulty bot move: builds the largest set of new
 * groups from the rack (respecting the 30-point opening rule), then, once
 * opened, greedily extends existing board groups with any leftover tiles.
 * Falls back to drawing a tile if no legal play exists.
 */
export function computeBotMove(rack: Tile[], board: TileGroup[], hasOpened: boolean): BotMove {
  const greedyGroups = findGreedyGroups(rack);

  if (!hasOpened) {
    if (greedyGroups.length > 0 && canOpenWith(greedyGroups)) {
      const tilesToPlace = greedyGroups.flatMap((g) => g.tiles.map((t) => t.id));
      return { newGroups: greedyGroups, boardExtensions: [], tilesToPlace, shouldDraw: false };
    }
    return { newGroups: [], boardExtensions: [], tilesToPlace: [], shouldDraw: true };
  }

  const usedInGroups = new Set(greedyGroups.flatMap((g) => g.tiles.map((t) => t.id)));
  const leftoverAfterGroups = rack.filter((t) => !usedInGroups.has(t.id));

  const { extensions, usedTileIds } = extendBoardGroups(board, leftoverAfterGroups);

  const tilesToPlace = [...greedyGroups.flatMap((g) => g.tiles.map((t) => t.id)), ...usedTileIds];

  if (greedyGroups.length === 0 && extensions.length === 0) {
    return { newGroups: [], boardExtensions: [], tilesToPlace: [], shouldDraw: true };
  }

  return { newGroups: greedyGroups, boardExtensions: extensions, tilesToPlace, shouldDraw: false };
}
