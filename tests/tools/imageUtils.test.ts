import { describe, expect, it } from 'vitest';
import {
  cutHole,
  deriveMedallionState,
  fitPlacement,
  opaqueBounds,
  removeSampledKey,
  stoneGrade,
} from '../../tools/imageUtils';

describe('stoneGrade', () => {
  it('desaturates warm bronze into olive grey and keeps alpha', () => {
    const data = new Uint8Array([140, 100, 60, 77]);
    stoneGrade(data, 0.3, 1);
    const [r, g, b, a] = data;
    expect(a).toBe(77);
    expect(Math.max(r, g, b) - Math.min(r, g, b)).toBeLessThan((140 - 60) * 0.5);
    expect(b).toBeLessThan(g);
  });

  it('keeps the luminance of a neutral pixel without gain and scales it with gain', () => {
    const lum = (d: Uint8Array) => 0.299 * d[0] + 0.587 * d[1] + 0.114 * d[2];
    const plain = new Uint8Array([100, 100, 100, 255]);
    stoneGrade(plain, 0.3, 1);
    expect(lum(plain)).toBeCloseTo(100, 0);
    const bright = new Uint8Array([100, 100, 100, 255]);
    stoneGrade(bright, 0.3, 1.2);
    expect(lum(bright)).toBeCloseTo(120, 0);
  });
});

/** RGBA canvas filled with one color; `paint` sets single pixels. */
function canvas(w: number, h: number, rgba: number[]) {
  const data = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set(rgba, i * 4);
  const paint = (x: number, y: number, c: number[]) => data.set(c, (y * w + x) * 4);
  const at = (x: number, y: number) => [...data.subarray((y * w + x) * 4, (y * w + x) * 4 + 4)];
  return { data, paint, at };
}

describe('opaqueBounds', () => {
  it('finds the box of opaque pixels and ignores half-transparent ones', () => {
    const { data, paint } = canvas(10, 10, [0, 0, 0, 0]);
    for (let y = 3; y < 7; y++) for (let x = 2; x < 6; x++) paint(x, y, [9, 9, 9, 255]);
    paint(9, 9, [9, 9, 9, 100]);
    expect(opaqueBounds(data, 10, 10)).toEqual({ x: 2, y: 3, w: 4, h: 4 });
  });

  it('is null on an empty canvas', () => {
    expect(opaqueBounds(canvas(4, 4, [0, 0, 0, 0]).data, 4, 4)).toBeNull();
  });
});

describe('fitPlacement', () => {
  it('contain scales uniformly and centers', () => {
    const p = fitPlacement(
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 0, y: 0, w: 200, h: 200 },
      'contain',
    );
    expect(p).toEqual({ scaleX: 2, scaleY: 2, left: 0, top: 50 });
  });

  it('stretch fills the box exactly', () => {
    const p = fitPlacement(
      { x: 0, y: 0, w: 100, h: 50 },
      { x: 0, y: 0, w: 200, h: 200 },
      'stretch',
    );
    expect(p).toEqual({ scaleX: 2, scaleY: 4, left: 0, top: 0 });
  });

  it('maps an inner region onto the box, keeping it inside', () => {
    const src = { x: 30, y: 20, w: 40, h: 40 };
    const box = { x: 16, y: 16, w: 80, h: 60 };
    for (const mode of ['contain', 'stretch'] as const) {
      const p = fitPlacement(src, box, mode);
      const x0 = p.left + src.x * p.scaleX;
      const y0 = p.top + src.y * p.scaleY;
      expect(x0).toBeGreaterThanOrEqual(box.x - 0.5);
      expect(y0).toBeGreaterThanOrEqual(box.y - 0.5);
      expect(x0 + src.w * p.scaleX).toBeLessThanOrEqual(box.x + box.w + 0.5);
      expect(y0 + src.h * p.scaleY).toBeLessThanOrEqual(box.y + box.h + 0.5);
    }
  });
});

describe('cutHole', () => {
  it('clears the dark window connected to the center and returns its box', () => {
    const { data, paint, at } = canvas(20, 20, [120, 120, 120, 255]);
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) if (Math.hypot(x - 10, y - 10) <= 5) paint(x, y, [5, 5, 5, 255]);
    }
    paint(0, 0, [0, 0, 0, 255]);
    const box = cutHole(data, 20, 20);
    expect(at(10, 10)[3]).toBe(0);
    expect(at(19, 10)[3]).toBe(255);
    expect(at(0, 0)[3]).toBe(255);
    expect(box).toEqual({ x: 5, y: 5, w: 11, h: 11 });
  });

  it('is null when the center is not dark', () => {
    expect(cutHole(canvas(8, 8, [200, 200, 200, 255]).data, 8, 8)).toBeNull();
  });
});

describe('deriveMedallionState', () => {
  const W = 64;
  const base = () => {
    const c = canvas(W, W, [120, 90, 60, 255]);
    c.paint(0, 0, [120, 90, 60, 0]);
    return c.data;
  };
  const meanLum = (d: Uint8Array) => {
    let s = 0;
    for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2];
    return s / (d.length / 4);
  };
  const alpha = (d: Uint8Array) => d.filter((_, i) => i % 4 === 3);

  it('never touches alpha', () => {
    for (const s of ['hover', 'pressed', 'disabled'] as const) {
      expect(alpha(deriveMedallionState(base(), W, W, s))).toEqual(alpha(base()));
    }
  });

  it('hover is lighter and pressed darker than normal', () => {
    expect(meanLum(deriveMedallionState(base(), W, W, 'hover'))).toBeGreaterThan(meanLum(base()));
    expect(meanLum(deriveMedallionState(base(), W, W, 'pressed'))).toBeLessThan(meanLum(base()));
  });

  it('disabled desaturates at least 4×', () => {
    const d = deriveMedallionState(base(), W, W, 'disabled');
    const i = (5 * W + 5) * 4;
    expect((d[i] - d[i + 2]) * 4).toBeLessThanOrEqual(120 - 60);
  });

  it('is deterministic', () => {
    expect(deriveMedallionState(base(), W, W, 'hover')).toEqual(
      deriveMedallionState(base(), W, W, 'hover'),
    );
  });
});

describe('removeSampledKey', () => {
  it('clears the corner color and keeps distant colors', () => {
    const { data, paint, at } = canvas(20, 20, [190, 22, 96, 255]);
    paint(10, 10, [200, 190, 160, 255]);
    removeSampledKey(data, 20, 20);
    expect(at(0, 0)[3]).toBe(0);
    expect(at(10, 10)).toEqual([200, 190, 160, 255]);
  });
});
