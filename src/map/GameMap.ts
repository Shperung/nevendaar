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

/**
 * Picks up to `count` distinct walkable tiles at random, farther than `minDist` tiles from `avoid`.
 * Returns tile centers.
 */
export function randomFloorTiles(
  map: GameMap,
  count: number,
  rng: () => number,
  avoid: { x: number; y: number },
  minDist: number,
): { x: number; y: number }[] {
  const taken = new Set<number>();
  const result: { x: number; y: number }[] = [];
  // Bounded attempts so a nearly full map can't loop forever.
  for (let attempt = 0; attempt < count * 20 && result.length < count; attempt++) {
    const tx = Math.floor(rng() * map.width);
    const ty = Math.floor(rng() * map.height);
    const x = tx + 0.5;
    const y = ty + 0.5;
    const i = ty * map.width + tx;
    if (taken.has(i) || !isWalkable(map, tx, ty)) continue;
    if (Math.hypot(x - avoid.x, y - avoid.y) <= minDist) continue;
    taken.add(i);
    result.push({ x, y });
  }
  return result;
}

/**
 * Labels groups of edge-connected blocked tiles. Returns cluster[ty * width + tx]:
 * the index of the group's first tile in row-major order, or -1 for walkable tiles.
 */
export function obstacleClusters(map: GameMap): Int32Array {
  const { width, height } = map;
  const cluster = new Int32Array(width * height).fill(-1);
  for (let start = 0; start < cluster.length; start++) {
    if (cluster[start] !== -1 || isWalkable(map, start % width, Math.floor(start / width)))
      continue;
    const stack = [start];
    cluster[start] = start;
    while (stack.length) {
      const i = stack.pop() as number;
      const x = i % width;
      const y = Math.floor(i / width);
      for (const [nx, ny] of [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= width || ny >= height || isWalkable(map, nx, ny)) continue;
        const n = ny * width + nx;
        if (cluster[n] !== -1) continue;
        cluster[n] = start;
        stack.push(n);
      }
    }
  }
  return cluster;
}
