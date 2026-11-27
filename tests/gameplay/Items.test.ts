import { afterEach, describe, expect, it, vi } from 'vitest';
import AFFIXES from '../../public/assets/data/affixes.json';
import ITEMS from '../../public/assets/data/items.json';
import { parseItemData, restoreItems, type Item } from '../../src/gameplay/Items';

const DATA = parseItemData(ITEMS, AFFIXES);

const BASE = {
  id: 'cleaver',
  name: 'Тесак',
  gender: 'm',
  type: 'weapon1h',
  qlvl: 1,
  weight: 10,
  damage: [3, 7],
  icon: 'item_cleaver',
};
const UNIQUE = {
  id: 'oath',
  name: 'Присяга',
  base: 'cleaver',
  minIlvl: 1,
  weight: 1,
  stats: [{ stat: 'damagePct', min: 1, max: 2 }],
  icon: 'unique_oath',
};
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
const NAMES = { first: ['Жало'], second: ['Ворона'] };

const items = (o: object = {}) => ({ bases: [BASE], uniques: [UNIQUE], rareNames: NAMES, ...o });

describe('parseItemData', () => {
  it('reads the shipped items.json and affixes.json', () => {
    expect(DATA.bases).toHaveLength(20);
    expect(DATA.uniques).toHaveLength(12);
    expect(DATA.affixes).toHaveLength(13);
    expect(DATA.affixes.filter((a) => a.kind === 'prefix')).toHaveLength(7);
    for (const b of DATA.bases) expect(b.icon).toBe(`item_${b.id}`);
    for (const u of DATA.uniques) expect(u.icon).toBe(`unique_${u.id}`);
    expect(DATA.affixById.get('of_wake')?.names).toEqual({
      m: 'Тризни',
      f: 'Тризни',
      pl: 'Тризни',
    });
  });

  it('throws on broken data with a file prefix', () => {
    const bad: [unknown, unknown][] = [
      [items({ uniques: [{ ...UNIQUE, base: 'nope' }] }), [PREFIX]],
      [items({ bases: [{ ...BASE, type: 'wand' }] }), [PREFIX]],
      [items({ bases: [{ ...BASE, gender: 'n' }] }), [PREFIX]],
      [items({ bases: [BASE, BASE] }), [PREFIX]],
      [items({ uniques: [{ ...UNIQUE, stats: [{ stat: 'mana', min: 1, max: 2 }] }] }), [PREFIX]],
      [items({ rareNames: { first: [], second: ['x'] } }), [PREFIX]],
    ];
    for (const [i, a] of bad) expect(() => parseItemData(i, a)).toThrow(/^items\.json: /);

    const badAffixes = [
      { ...PREFIX, stat: 'mana' },
      { ...PREFIX, names: { m: 'Лютий', f: 'Люта' } },
      { ...PREFIX, tiers: [] },
      { ...PREFIX, types: ['wand'] },
      { ...PREFIX, tiers: [{ minIlvl: 1, min: 5, max: 3 }] },
      {
        ...PREFIX,
        tiers: [
          { minIlvl: 3, min: 1, max: 2 },
          { minIlvl: 1, min: 3, max: 4 },
        ],
      },
      { ...PREFIX, kind: 'suffix' },
    ];
    for (const a of badAffixes)
      expect(() => parseItemData(items(), [a])).toThrow(/^affixes\.json: /);
  });
});

describe('restoreItems', () => {
  afterEach(() => vi.restoreAllMocks());

  const magic: Item = {
    uid: 1,
    base: 'notched_cleaver',
    rarity: 'magic',
    ilvl: 2,
    affixes: [{ id: 'cruel', tier: 0, value: 7 }],
  };
  const unique: Item = {
    uid: 2,
    base: 'headsman_sword',
    rarity: 'unique',
    ilvl: 3,
    affixes: [{ stat: 'damagePct', value: 50 }],
    unique: 'ashen_oath',
  };
  const rare: Item = { ...magic, uid: 3, rarity: 'rare', rareName: [0, 9] };

  it('restores valid items in order', () => {
    const raw = JSON.parse(JSON.stringify([magic, unique, rare]));
    expect(restoreItems(raw, DATA)).toEqual([magic, unique, rare]);
  });

  it('skips items whose base, unique or affix disappeared, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const raw = [
      { ...magic, base: 'gone' },
      { ...unique, unique: 'gone' },
      { ...magic, affixes: [{ id: 'gone', tier: 0, value: 1 }] },
      { ...magic, affixes: [{ id: 'cruel', tier: 9, value: 1 }] },
      { ...rare, rareName: [99, 0] },
      magic,
    ];
    expect(restoreItems(raw, DATA)).toEqual([magic]);
    expect(warn).toHaveBeenCalledTimes(5);
  });

  it('reads garbage as an empty list', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    for (const raw of [null, 5, 'x', {}]) expect(restoreItems(raw, DATA)).toEqual([]);
    expect(restoreItems([1, 'a', null, [magic]], DATA)).toEqual([]);
  });
});
