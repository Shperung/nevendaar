import { describe, expect, it } from 'vitest';
import AFFIXES from '../../public/assets/data/affixes.json';
import ITEMS from '../../public/assets/data/items.json';
import { rollItem } from '../../src/gameplay/ItemGenerator';
import { parseItemData, type Item, type ItemData } from '../../src/gameplay/Items';
import { mulberry32 } from '../../src/gameplay/Random';

const DATA = parseItemData(ITEMS, AFFIXES);
const WEIGHTS = { common: 60, magic: 30, rare: 9, unique: 1 };

function must<T>(v: T | undefined): T {
  if (v === undefined) throw new Error('missing table entry');
  return v;
}

function rolls(data: ItemData, weights: typeof WEIGHTS, ilvl: number, n: number, seed = 1): Item[] {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, (_, i) => rollItem(data, weights, ilvl, rng, i + 1));
}

const PREFIX = {
  id: 'cruel',
  kind: 'prefix',
  group: 'damagePct',
  stat: 'damagePct',
  weight: 10,
  types: ['weapon1h'],
  names: { m: 'Лютий', f: 'Люта', pl: 'Люті' },
  tiers: [{ minIlvl: 1, min: 5, max: 10 }],
};
const synthetic = (affixes: unknown[]) =>
  parseItemData(
    {
      bases: [
        {
          id: 'cleaver',
          name: 'Тесак',
          gender: 'm',
          type: 'weapon1h',
          qlvl: 1,
          weight: 1,
          icon: 'item_cleaver',
        },
      ],
      uniques: [],
      rareNames: { first: ['Жало'], second: ['Ворона'] },
    },
    affixes,
  );

describe('rollItem', () => {
  it('is deterministic for a fixed seed', () => {
    expect(rolls(DATA, WEIGHTS, 3, 500, 7)).toEqual(rolls(DATA, WEIGHTS, 3, 500, 7));
  });

  it('respects qlvl, tier minIlvl and value ranges', () => {
    for (const ilvl of [1, 2, 3, 6]) {
      for (const item of rolls(DATA, { ...WEIGHTS, rare: 30, unique: 30 }, ilvl, 3000, ilvl)) {
        const base = must(DATA.baseById.get(item.base));
        expect(base.qlvl).toBeLessThanOrEqual(ilvl);
        expect(item.ilvl).toBe(ilvl);
        for (const a of item.affixes) {
          if (!('id' in a)) continue;
          const def = must(DATA.affixById.get(a.id));
          const tier = def.tiers[a.tier];
          expect(tier.minIlvl).toBeLessThanOrEqual(ilvl);
          expect(a.value).toBeGreaterThanOrEqual(tier.min);
          expect(a.value).toBeLessThanOrEqual(tier.max);
          expect(def.types).toContain(base.type);
        }
      }
    }
  });

  it('gives magic 1–2 and rare 3–4 affixes within the kind caps, no repeated group', () => {
    const items = rolls(DATA, { common: 0, magic: 50, rare: 50, unique: 0 }, 6, 5000, 3);
    for (const item of items) {
      const defs = item.affixes.map((a) => ('id' in a ? must(DATA.affixById.get(a.id)) : null));
      const prefixes = defs.filter((d) => d?.kind === 'prefix').length;
      const suffixes = defs.filter((d) => d?.kind === 'suffix').length;
      expect(new Set(defs.map((d) => d?.group)).size).toBe(defs.length);
      if (item.rarity === 'magic') {
        expect(defs.length).toBeGreaterThanOrEqual(1);
        expect(prefixes).toBeLessThanOrEqual(1);
        expect(suffixes).toBeLessThanOrEqual(1);
      } else if (item.rarity === 'rare') {
        expect(defs.length).toBeLessThanOrEqual(4);
        expect(prefixes).toBeLessThanOrEqual(2);
        expect(suffixes).toBeLessThanOrEqual(2);
        expect(item.rareName).toBeDefined();
      }
    }
    // Weapons have plenty of affixes of both kinds, so a rare weapon always gets 3–4.
    const rareWeapons = items.filter(
      (i) => i.rarity === 'rare' && must(DATA.baseById.get(i.base)).type.startsWith('weapon'),
    );
    expect(rareWeapons.length).toBeGreaterThan(0);
    for (const i of rareWeapons) expect(i.affixes.length).toBeGreaterThanOrEqual(3);
  });

  it('rolls unique stats in range and falls back to rare below every unique minIlvl', () => {
    const only = { common: 0, magic: 0, rare: 0, unique: 1 };
    for (const item of rolls(DATA, only, 3, 2000, 5)) {
      if (item.rarity !== 'unique') {
        expect(item.rarity).toBe('rare');
        continue;
      }
      const def = must(DATA.uniqueById.get(must(item.unique)));
      expect(def.base).toBe(item.base);
      def.stats.forEach((s, i) => {
        const a = item.affixes[i];
        expect('stat' in a && a.stat).toBe(s.stat);
        expect(a.value).toBeGreaterThanOrEqual(s.min);
        expect(a.value).toBeLessThanOrEqual(s.max);
      });
    }
    // headsman_sword (qlvl 3) has only ashen_oath (minIlvl 3); at ilvl 1 the sickle/helm/cassock
    // uniques are open, but e.g. the cleaver has none, so it always ends up rare.
    const low = rolls(DATA, only, 1, 2000, 6);
    for (const item of low.filter((i) => i.base === 'notched_cleaver')) {
      expect(item.rarity).toBe('rare');
    }
    expect(low.some((i) => i.rarity === 'unique')).toBe(true);
  });

  it('keeps a rare with the single affix it can get', () => {
    const data = synthetic([PREFIX]);
    for (const item of rolls(data, { common: 0, magic: 0, rare: 1, unique: 0 }, 1, 200)) {
      expect(item.rarity).toBe('rare');
      expect(item.affixes).toHaveLength(1);
    }
  });

  it('turns magic/rare into common when the base has no affixes', () => {
    const data = synthetic([{ ...PREFIX, types: ['ring'] }]);
    for (const item of rolls(data, { common: 0, magic: 1, rare: 1, unique: 0 }, 1, 200)) {
      expect(item.rarity).toBe('common');
      expect(item.affixes).toEqual([]);
      expect(item.rareName).toBeUndefined();
    }
  });

  it('rolls rarities close to their weights', () => {
    const items = rolls(DATA, WEIGHTS, 3, 10000, 11);
    const share = (r: string) => items.filter((i) => i.rarity === r).length / items.length;
    expect(share('common')).toBeCloseTo(0.6, 1);
    expect(share('magic')).toBeCloseTo(0.3, 1);
    // Failed uniques move into rare, so rare + unique together are ~10 %.
    expect(share('rare') + share('unique')).toBeCloseTo(0.1, 1);
    expect(share('unique')).toBeLessThan(0.02);
  });
});
