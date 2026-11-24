import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/gameplay/Random';
import {
  isWalkable,
  obstacleClusters,
  parseAsciiMap,
  randomFloorTiles,
} from '../../src/map/GameMap';

describe('obstacleClusters', () => {
  it('groups edge-connected blocked tiles, not diagonal ones', () => {
    const map = parseAsciiMap(['##.', '.#.', '..#']);
    const c = obstacleClusters(map);
    expect([...c]).toEqual([0, 0, -1, -1, 0, -1, -1, -1, 8]);
  });
});

describe('randomFloorTiles', () => {
  const map = parseAsciiMap(['#....', '.#...', '.....', '...#.', '.....']);

  it('returns distinct walkable tile centers outside the avoid radius', () => {
    const tiles = randomFloorTiles(map, 10, mulberry32(1), { x: 2.5, y: 2.5 }, 1);
    expect(tiles.length).toBe(10);
    expect(new Set(tiles.map((t) => `${t.x},${t.y}`)).size).toBe(10);
    for (const t of tiles) {
      expect(isWalkable(map, t.x, t.y)).toBe(true);
      expect(Math.hypot(t.x - 2.5, t.y - 2.5)).toBeGreaterThan(1);
    }
  });

  it('is reproducible for the same seed', () => {
    const pick = () => randomFloorTiles(map, 5, mulberry32(7), { x: 0, y: 0 }, 0);
    expect(pick()).toEqual(pick());
  });
});
