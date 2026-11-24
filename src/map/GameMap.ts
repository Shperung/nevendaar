export interface GameMap {
  width: number;
  height: number;
  /** grid[ty][tx]: 0 = walkable, 1 = blocked. */
  grid: number[][];
}

/** Builds a map from ASCII rows: '#' = obstacle, anything else = floor. */
export function parseAsciiMap(rows: string[]): GameMap {
  const grid = rows.map((row) => [...row].map((c) => (c === '#' ? 1 : 0)));
  return { width: grid[0]?.length ?? 0, height: grid.length, grid };
}

export function isWalkable(map: GameMap, tx: number, ty: number): boolean {
  return map.grid[Math.floor(ty)]?.[Math.floor(tx)] === 0;
}
