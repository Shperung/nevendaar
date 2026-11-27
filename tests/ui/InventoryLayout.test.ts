import { describe, expect, it } from 'vitest';
import {
  cardPosition,
  heroStatRows,
  inventoryScale,
  type HeroStats,
} from '../../src/ui/InventoryLayout';

describe('inventoryScale', () => {
  it('keeps the design size on a large screen', () => {
    expect(inventoryScale(1920, 1080)).toBe(1);
  });

  it('shrinks to the tighter side', () => {
    expect(inventoryScale(800, 900)).toBeCloseTo((800 * 0.92) / 960);
    expect(inventoryScale(1600, 500)).toBeCloseTo((500 * 0.92) / 640);
  });

  it('is never above 1', () => {
    for (const [w, h] of [
      [3840, 2160],
      [10000, 10000],
      [960, 640],
    ])
      expect(inventoryScale(w, h)).toBeLessThanOrEqual(1);
  });
});

describe('cardPosition', () => {
  const card = { w: 300, h: 200 };
  const view = { w: 1000, h: 800 };

  it('puts the card right of and below the cursor', () => {
    expect(cardPosition({ x: 100, y: 100 }, card, view)).toEqual({ x: 116, y: 116 });
  });

  it('flips left / up near the right / bottom edge', () => {
    expect(cardPosition({ x: 900, y: 700 }, card, view)).toEqual({ x: 584, y: 484 });
  });

  it('never goes past 0', () => {
    expect(cardPosition({ x: 200, y: 150 }, card, { w: 400, h: 300 })).toEqual({ x: 0, y: 0 });
  });
});

describe('heroStatRows', () => {
  const stats: HeroStats = {
    name: 'Вотан',
    hp: 86.4,
    maxHp: 120,
    damage: 10,
    cooldown: 0.5,
    range: 1.2,
    speed: 4,
    gold: 12345,
    depth: 1,
  };

  it('formats every row in order', () => {
    expect(heroStatRows(stats)).toEqual([
      ["Здоров'я", '87 / 120'],
      ['Шкода', '10'],
      ['Швидкість атаки', '2.0 / с'],
      ['Дальність атаки', '1.2 тайла'],
      ['Швидкість руху', '4.0 тайла/с'],
      ['Золото', (12345).toLocaleString('uk-UA')],
      ['Глибина', '1'],
    ]);
  });
});
