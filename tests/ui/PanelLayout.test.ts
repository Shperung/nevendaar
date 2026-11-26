import { describe, expect, it } from 'vitest';
import {
  clampTooltip,
  FIXED_H,
  healthFraction,
  PANEL_BLOCKS,
  panelLayout,
} from '../../src/ui/PanelLayout';

describe('panelLayout', () => {
  it('uses the design size at height 800', () => {
    const l = panelLayout(1600, 800);
    expect(l.scale).toBe(1);
    expect(l.width).toBe(200);
    expect(l.columnH).toBe(800 - FIXED_H);
    expect(l.columnH).toBeGreaterThan(0);
  });

  it('clamps the scale and gives the rest of the height to the column', () => {
    const low = panelLayout(1600, 400);
    expect(low.scale).toBe(0.7);
    expect(low.columnH).toBe(Math.max(0, 400 / 0.7 - FIXED_H));
    const high = panelLayout(4000, 1600);
    expect(high.scale).toBe(1.4);
    expect(high.columnH).toBeCloseTo(1600 / 1.4 - FIXED_H);
    expect(high.columnH).toBeGreaterThan(800 - FIXED_H);
  });

  it('leaves the game at least 60 % of a narrow window, but not below the min scale', () => {
    const l = panelLayout(600, 1000);
    expect(l.width).toBeLessThanOrEqual(600 * 0.4);
    expect(panelLayout(200, 1000).scale).toBe(0.7);
  });

  it('is always flush with the right edge', () => {
    for (const [w, h] of [
      [1600, 800],
      [600, 1000],
      [300, 300],
      [3840, 2160],
    ]) {
      const l = panelLayout(w, h);
      expect(l.x + l.width).toBe(w);
    }
  });

  it('stacks blocks top to bottom and shifts the ones below the column by its growth', () => {
    const a = panelLayout(1600, 800);
    const b = panelLayout(4000, 1600);
    const growth = b.columnH - a.columnH;
    let below = false;
    for (let i = 1; i < PANEL_BLOCKS.length; i++) {
      const prev = PANEL_BLOCKS[i - 1];
      const cur = PANEL_BLOCKS[i];
      const prevH = prev.name === 'column' ? a.columnH : prev.h;
      expect(a.blocks[cur.name]).toBe(a.blocks[prev.name] + prevH);
      if (prev.name === 'column') below = true;
      expect(b.blocks[cur.name] - a.blocks[cur.name]).toBeCloseTo(below ? growth : 0);
    }
  });
});

describe('clampTooltip', () => {
  it('keeps the tooltip on screen', () => {
    expect(clampTooltip(-20, 50, 600)).toBe(0);
    expect(clampTooltip(580, 50, 600)).toBe(550);
    expect(clampTooltip(100, 50, 600)).toBe(100);
  });
});

describe('healthFraction', () => {
  it('is current / max clamped to [0, 1]', () => {
    expect(healthFraction(87, 100)).toBe(0.87);
    expect(healthFraction(0, 100)).toBe(0);
    expect(healthFraction(10, 0)).toBe(0);
    expect(healthFraction(120, 100)).toBe(1);
    expect(healthFraction(-5, 100)).toBe(0);
  });
});
