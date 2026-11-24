import { describe, expect, it } from 'vitest';
import { toScreen, toTile } from '../../src/map/IsoMath';

describe('IsoMath', () => {
  it('maps tile axes to diamond directions', () => {
    expect(toScreen(0, 0)).toEqual({ x: 0, y: 0 });
    expect(toScreen(1, 0)).toEqual({ x: 64, y: 32 });
    expect(toScreen(0, 1)).toEqual({ x: -64, y: 32 });
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
