import { describe, expect, it } from 'vitest';
import { heroStatRows, inventoryScale, type HeroStats } from '../../src/ui/InventoryLayout';

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
