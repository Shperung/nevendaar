import { describe, expect, it } from 'vitest';
import { directionFromDelta, toScreen, toTile } from '../../src/map/IsoMath';

describe('IsoMath', () => {
  it('maps tile axes to diamond directions', () => {
    expect(toScreen(0, 0)).toEqual({ x: 0, y: 0 });
    expect(toScreen(1, 0)).toEqual({ x: 64, y: 32 });
    expect(toScreen(0, 1)).toEqual({ x: -64, y: 32 });
  });

  it('directionFromDelta uses screen-space 8-way facing', () => {
    expect(directionFromDelta(-1, -1)).toBe(0); // N
    expect(directionFromDelta(1, -1)).toBe(2); // E
    expect(directionFromDelta(1, 0)).toBe(3); // SE
    expect(directionFromDelta(1, 1)).toBe(4); // S
    expect(directionFromDelta(-1, 1)).toBe(6); // W
    expect(directionFromDelta(-1, 0)).toBe(7); // NW
  });

  it('toTile is the inverse of toScreen', () => {
    for (const [tx, ty] of [
      [3.5, -2.25],
      [-7, 4],
      [0.1, 0.9],
    ]) {
      const s = toScreen(tx, ty);
      const t = toTile(s.x, s.y);
      expect(t.x).toBeCloseTo(tx);
      expect(t.y).toBeCloseTo(ty);
    }
  });
});
