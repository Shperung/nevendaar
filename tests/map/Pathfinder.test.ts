import { describe, expect, it } from 'vitest';
import { isWalkable, parseAsciiMap } from '../../src/map/GameMap';
import { findPath } from '../../src/map/Pathfinder';

const map = parseAsciiMap(['.....', '.###.', '.....']);

describe('Pathfinder', () => {
  it('goes around a wall and ends at the exact target', () => {
    const path = findPath(map, { x: 2.5, y: 0.5 }, { x: 2.3, y: 2.7 });
    expect(path).not.toBeNull();
    expect(path?.at(-1)).toEqual({ x: 2.3, y: 2.7 });
    for (const p of path ?? []) expect(isWalkable(map, p.x, p.y)).toBe(true);
  });

  it('returns null for a blocked or out-of-map target', () => {
    expect(findPath(map, { x: 0.5, y: 0.5 }, { x: 2.5, y: 1.5 })).toBeNull();
    expect(findPath(map, { x: 0.5, y: 0.5 }, { x: -1, y: 0.5 })).toBeNull();
  });

  it('moves straight to a point in the same tile', () => {
    expect(findPath(map, { x: 0.2, y: 0.2 }, { x: 0.8, y: 0.6 })).toEqual([{ x: 0.8, y: 0.6 }]);
  });
});
