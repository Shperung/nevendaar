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

export interface Tile {
  x: number;
  y: number;
}

export interface PackOptions {
  count: number;
  minSize: number;
  maxSize: number;
  /** Max distance of a pack member from its center (tiles). */
  radius: number;
  /** Min distance between pack centers (tiles). */
  spacing: number;
  /** No pack member is closer than `minDist` tiles to `avoid`. */
  avoid: Tile;
  minDist: number;
}

/**
 * Picks up to `count` packs of distinct walkable tiles: random centers kept `spacing` apart,
 * each filled with tiles reachable from the center within `radius`, so walls never split a pack.
 * Returns tile centers.
 */
export function floorPacks(map: GameMap, o: PackOptions, rng: () => number): Tile[][] {
  const centers: Tile[] = [];
  const packs: Tile[][] = [];
  // Bounded attempts so a crowded map can't loop forever.
  for (let attempt = 0; attempt < o.count * 20 && packs.length < o.count; attempt++) {
    const tx = Math.floor(rng() * map.width);
    const ty = Math.floor(rng() * map.height);
    const c = { x: tx + 0.5, y: ty + 0.5 };
    if (!isWalkable(map, tx, ty)) continue;
    if (Math.hypot(c.x - o.avoid.x, c.y - o.avoid.y) <= o.minDist + o.radius) continue;
    if (centers.some((p) => Math.hypot(c.x - p.x, c.y - p.y) < o.spacing)) continue;
    centers.push(c);

    const near = reachableWithin(map, tx, ty, o.radius);
    const size = Math.min(near.length, o.minSize + Math.floor(rng() * (o.maxSize - o.minSize + 1)));
    // Partial Fisher–Yates: the first `size` entries become a uniform random subset.
    for (let i = 0; i < size; i++) {
      const j = i + Math.floor(rng() * (near.length - i));
      [near[i], near[j]] = [near[j], near[i]];
    }
    packs.push(near.slice(0, size));
  }
  return packs;
}

/** Walkable tiles reachable from (tx, ty) by edge steps without leaving `radius` of it. */
function reachableWithin(map: GameMap, tx: number, ty: number, radius: number): Tile[] {
  const seen = new Set([ty * map.width + tx]);
  const queue: Tile[] = [{ x: tx, y: ty }];
  for (let q = 0; q < queue.length; q++) {
    const { x, y } = queue[q];
    for (const [nx, ny] of [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ]) {
      const n = ny * map.width + nx;
      if (nx < 0 || nx >= map.width || seen.has(n) || !isWalkable(map, nx, ny)) continue;
      if (Math.hypot(nx - tx, ny - ty) > radius) continue;
      seen.add(n);
      queue.push({ x: nx, y: ny });
    }
  }
  return queue.map((t) => ({ x: t.x + 0.5, y: t.y + 0.5 }));
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
