import { describe, expect, it } from 'vitest';
import AFFIXES from '../../public/assets/data/affixes.json';
import ITEMS from '../../public/assets/data/items.json';
import { parseItemData, type Item } from '../../src/gameplay/Items';
import { describeItem, itemName, sackLabel, topRarity } from '../../src/ui/ItemText';

const DATA = parseItemData(ITEMS, AFFIXES);

const item = (o: Partial<Item>): Item => ({
  uid: 1,
  base: 'rusted_helm',
  rarity: 'common',
  ilvl: 5,
  affixes: [],
  ...o,
});
const magic = (base: string, ...ids: string[]) =>
  item({ base, rarity: 'magic', affixes: ids.map((id) => ({ id, tier: 0, value: 3 })) });

describe('itemName', () => {
  it('names common items by the base', () => {
    expect(itemName(DATA, item({}))).toBe('Іржавий шолом');
  });

  it('agrees the magic prefix with the base gender', () => {
    expect(itemName(DATA, magic('notched_cleaver', 'cruel', 'of_wake'))).toBe(
      'Лютий щербатий тесак Тризни',
    );
    expect(itemName(DATA, magic('war_scythe', 'cruel'))).toBe('Люта бойова коса');
    expect(itemName(DATA, magic('worn_boots', 'sturdy'))).toBe('Міцні стоптані чоботи');
    expect(itemName(DATA, magic('worn_boots', 'of_flight'))).toBe('Стоптані чоботи Втечі');
  });

  it('names rare items by two words and uniques by their name', () => {
    const rare = item({ rarity: 'rare', rareName: [0, 0] });
    expect(itemName(DATA, rare)).toBe('Жало Ворона');
    expect(describeItem(DATA, rare).baseName).toBe('Іржавий шолом');
    const unique = item({ base: 'headsman_sword', rarity: 'unique', unique: 'ashen_oath' });
    expect(itemName(DATA, unique)).toBe('Попелиста Присяга');
  });
});

describe('describeItem', () => {
  it('builds the card lines', () => {
    const card = describeItem(DATA, magic('notched_cleaver', 'cruel'));
    expect(card.subtitle).toBe('Чарівний артефакт · рівень 5');
    expect(card.typeLine).toBe('Одноручна зброя');
    expect(card.baseLine).toBe('Шкода: 3–7');
    expect(card.baseName).toBeUndefined();
    expect(card.affixLines).toEqual(['+3% шкоди']);
    expect(card.icons).toEqual(['item_notched_cleaver']);
    expect(card.letter).toBe('О');
  });

  it('shows the base stat by type', () => {
    expect(describeItem(DATA, item({ base: 'headsman_sword' })).baseLine).toBe('Шкода: 9–17');
    expect(describeItem(DATA, item({ base: 'visored_bascinet' })).baseLine).toBe('Броня: 6');
    expect(describeItem(DATA, item({ base: 'iron_band' })).baseLine).toBeUndefined();
  });

  it('formats every stat line', () => {
    const stats = [
      'damage',
      'damagePct',
      'attackSpeedPct',
      'life',
      'lifeOnKill',
      'lifeSteal',
      'armor',
      'armorPct',
      'moveSpeedPct',
    ] as const;
    const card = describeItem(
      DATA,
      item({ rarity: 'unique', affixes: stats.map((stat) => ({ stat, value: 4 })) }),
    );
    expect(card.affixLines).toEqual([
      '+4 до шкоди',
      '+4% шкоди',
      '+4% швидкості атаки',
      "+4 до здоров'я",
      "+4 здоров'я за кожне вбивство",
      "4% завданої шкоди повертає здоров'я",
      '+4 до броні',
      '+4% броні',
      '+4% швидкості руху',
    ]);
  });

  it('gives uniques their icon first and the flavor', () => {
    const card = describeItem(
      DATA,
      item({ base: 'headsman_sword', rarity: 'unique', unique: 'ashen_oath' }),
    );
    expect(card.icons).toEqual(['unique_ashen_oath', 'item_headsman_sword']);
    expect(card.flavor).toMatch(/^Клинок/);
    expect(card.subtitle).toBe('Унікальний артефакт · рівень 5');
  });
});

describe('sackLabel', () => {
  const n = (k: number) => Array.from({ length: k }, () => item({}));
  it('declines the artifact count', () => {
    expect(sackLabel(12, n(2))).toBe('Мішечок: 12 золота, 2 артефакти');
    expect(sackLabel(0, n(1))).toBe('Мішечок: 1 артефакт');
    expect(sackLabel(0, n(5))).toBe('Мішечок: 5 артефактів');
    expect(sackLabel(0, n(11))).toBe('Мішечок: 11 артефактів');
    expect(sackLabel(0, n(21))).toBe('Мішечок: 21 артефакт');
  });
});

describe('topRarity', () => {
  it('picks the highest rarity', () => {
    expect(topRarity([])).toBe('common');
    expect(topRarity([item({ rarity: 'magic' }), item({ rarity: 'rare' }), item({})])).toBe('rare');
  });
});
