import { describe, expect, it } from 'vitest';
import { GOLD_SCATTER } from '../../src/config';
import { dropPosition, parseLoot, pileTier, rollGold } from '../../src/gameplay/Loot';
import { mulberry32 } from '../../src/gameplay/Random';

const PICKUP = { pickupDelay: 2, pickupRadius: 0.6 };

describe('parseLoot', () => {
  it('reads _pickup and does not treat it as a monster', () => {
    const t = parseLoot({
      _pickup: PICKUP,
      skeleton: { gold: { chance: 0.4, base: 4, spread: 0.5 } },
      bat: {},
    });
    expect(t.pickup).toEqual(PICKUP);
    expect(Object.keys(t.monsters).sort()).toEqual(['bat', 'skeleton']);
    expect(t.monsters.skeleton.gold).toEqual({ chance: 0.4, base: 4, spread: 0.5 });
    expect(t.monsters.bat.gold).toBeUndefined();
  });

  it('throws on broken data', () => {
    const gold = (g: object) => ({ _pickup: PICKUP, skeleton: { gold: g } });
    expect(() => parseLoot({ skeleton: {} })).toThrow();
    expect(() => parseLoot(gold({ chance: 1.5, base: 4, spread: 0 }))).toThrow();
    expect(() => parseLoot(gold({ chance: 0.5, base: 4, spread: 1 }))).toThrow();
    expect(() => parseLoot(gold({ chance: 0.5, base: '4', spread: 0 }))).toThrow();
  });
});

describe('rollGold', () => {
  const def = { chance: 0.5, base: 10, spread: 0.3 };

  it('is deterministic for a fixed seed', () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    const rolls = Array.from({ length: 100 }, () => rollGold(def, a, 1));
    expect(rolls).toEqual(Array.from({ length: 100 }, () => rollGold(def, b, 1)));
  });

  it('chance 0 never drops, chance 1 always drops at least 1', () => {
    const rng = mulberry32(1);
    for (let i = 0; i < 1000; i++) {
      expect(rollGold({ ...def, chance: 0 }, rng, 1)).toBe(0);
      expect(rollGold({ ...def, chance: 1 }, rng, 1)).toBeGreaterThanOrEqual(1);
    }
  });

  it('keeps amounts in base ± spread and drops at about `chance` rate', () => {
    const rng = mulberry32(123);
    let drops = 0;
    for (let i = 0; i < 10000; i++) {
      const g = rollGold(def, rng, 1);
      if (g === 0) continue;
      drops++;
      expect(g).toBeGreaterThanOrEqual(7);
      expect(g).toBeLessThanOrEqual(13);
    }
    expect(Math.abs(drops / 10000 - def.chance)).toBeLessThan(0.02);
  });

  it('handles spread 0, minimum 1 and the multiplier', () => {
    const rng = mulberry32(5);
    for (let i = 0; i < 1000; i++) {
      expect(rollGold({ chance: 1, base: 10, spread: 0 }, rng, 1)).toBe(10);
      expect(rollGold({ chance: 1, base: 1, spread: 0.9 }, rng, 1)).toBeGreaterThanOrEqual(1);
      expect(rollGold({ chance: 1, base: 10, spread: 0 }, rng, 2)).toBe(20);
    }
  });
});

describe('dropPosition', () => {
  it('stays within GOLD_SCATTER of the death spot', () => {
    const rng = mulberry32(9);
    for (let i = 0; i < 1000; i++) {
      const p = dropPosition(5.5, 5.5, rng, () => true);
      expect(Math.hypot(p.x - 5.5, p.y - 5.5)).toBeLessThanOrEqual(GOLD_SCATTER + 1e-9);
    }
  });

  it('falls back to the exact spot when the shifted tile is blocked', () => {
    expect(dropPosition(5.5, 5.5, mulberry32(9), () => false)).toEqual({ x: 5.5, y: 5.5 });
  });
});

describe('pileTier', () => {
  it('splits at 5/6 and 15/16', () => {
    expect([5, 6, 15, 16].map(pileTier)).toEqual([0, 1, 1, 2]);
  });
});
