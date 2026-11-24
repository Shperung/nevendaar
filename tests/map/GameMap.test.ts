import { describe, expect, it } from 'vitest';
import { mulberry32 } from '../../src/gameplay/Random';
import { floorPacks, isWalkable, obstacleClusters, parseAsciiMap } from '../../src/map/GameMap';

describe('obstacleClusters', () => {
  it('groups edge-connected blocked tiles, not diagonal ones', () => {
    const map = parseAsciiMap(['##.', '.#.', '..#']);
    const c = obstacleClusters(map);
    expect([...c]).toEqual([0, 0, -1, -1, 0, -1, -1, -1, 8]);
  });
});

describe('floorPacks', () => {
  const map = parseAsciiMap(
    Array.from({ length: 30 }, (_, y) => (y === 15 ? '#'.repeat(30) : '.'.repeat(30))),
  );
  const opts = {
    count: 6,
    minSize: 3,
    maxSize: 5,
    radius: 2.5,
    spacing: 6,
    avoid: { x: 5.5, y: 5.5 },
    minDist: 3,
  };

  it('returns non-overlapping packs of walkable tiles near their center, away from avoid', () => {
    const packs = floorPacks(map, opts, mulberry32(1));
    expect(packs.length).toBe(6);
    const all = packs.flat();
    expect(new Set(all.map((t) => `${t.x},${t.y}`)).size).toBe(all.length);
    for (const pack of packs) {
      expect(pack.length).toBeGreaterThanOrEqual(3);
      expect(pack.length).toBeLessThanOrEqual(5);
      for (const t of pack) {
        expect(isWalkable(map, t.x, t.y)).toBe(true);
        expect(Math.hypot(t.x - 5.5, t.y - 5.5)).toBeGreaterThan(3);
        // A wall row at y = 15 must never split a pack.
        expect(t.y < 15).toBe(pack[0].y < 15);
        for (const u of pack) expect(Math.hypot(t.x - u.x, t.y - u.y)).toBeLessThanOrEqual(5);
      }
    }
  });

  it('is reproducible for the same seed', () => {
    const pick = () => floorPacks(map, opts, mulberry32(7));
    expect(pick()).toEqual(pick());
  });
});
