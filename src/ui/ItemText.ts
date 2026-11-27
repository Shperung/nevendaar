// Pure texts and colors of artifacts (no DOM or Pixi, so it is unit-tested).
import {
  RARITIES,
  type Item,
  type ItemData,
  type ItemType,
  type Rarity,
  type Stat,
} from '../gameplay/Items';

export const TYPE_NAMES: Record<ItemType, string> = {
  weapon1h: 'Одноручна зброя',
  weapon2h: 'Дворучна зброя',
  shield: 'Щит',
  helm: 'Шолом',
  armor: 'Обладунок',
  gloves: 'Рукавиці',
  belt: 'Пояс',
  boots: 'Чоботи',
  ring: 'Перстень',
  amulet: 'Амулет',
};

const RARITY_NAMES: Record<Rarity, string> = {
  common: 'Звичайний',
  magic: 'Чарівний',
  rare: 'Рідкісний',
  unique: 'Унікальний',
};

/** Dark inks of the item name on the parchment card. */
export const RARITY_INK: Record<Rarity, string> = {
  common: '#2a2118',
  magic: '#2c3f73',
  rare: '#7a5410',
  unique: '#7a1c14',
};

/** Bright colors over the dark game world: sack aura, hover label, find log, cell border. */
export const RARITY_GLOW: Record<Rarity, number> = {
  common: 0xd8c8a0,
  magic: 0x6f8fd0,
  rare: 0xd9a441,
  unique: 0xc0392b,
};

const STAT_LINES: Record<Stat, (n: number) => string> = {
  damage: (n) => `+${n} до шкоди`,
  damagePct: (n) => `+${n}% шкоди`,
  attackSpeedPct: (n) => `+${n}% швидкості атаки`,
  life: (n) => `+${n} до здоров'я`,
  lifeOnKill: (n) => `+${n} здоров'я за кожне вбивство`,
  lifeSteal: (n) => `${n}% завданої шкоди повертає здоров'я`,
  armor: (n) => `+${n} до броні`,
  armorPct: (n) => `+${n}% броні`,
  moveSpeedPct: (n) => `+${n}% швидкості руху`,
};

function lowerFirst(s: string): string {
  return s.charAt(0).toLocaleLowerCase('uk') + s.slice(1);
}

/**
 * Display name: common — the base; magic — "[prefix] base [suffix]", the prefix agreeing with the
 * base gender and the base then lowercased; rare — two words of rareNames; unique — its own name.
 */
export function itemName(data: ItemData, item: Item): string {
  const base = data.baseById.get(item.base);
  if (!base) return item.base;
  if (item.rarity === 'unique' && item.unique) {
    return data.uniqueById.get(item.unique)?.name ?? base.name;
  }
  if (item.rarity === 'rare' && item.rareName) {
    const [i, j] = item.rareName;
    return `${data.rareNames.first[i]} ${data.rareNames.second[j]}`;
  }
  if (item.rarity !== 'magic') return base.name;
  let prefix = '';
  let suffix = '';
  for (const a of item.affixes) {
    const def = 'id' in a ? data.affixById.get(a.id) : undefined;
    if (def?.kind === 'prefix') prefix = def.names[base.gender];
    else if (def?.kind === 'suffix') suffix = def.names[base.gender];
  }
  const name = prefix ? `${prefix} ${lowerFirst(base.name)}` : base.name;
  return suffix ? `${name} ${suffix}` : name;
}

/** Text model of the artifact card, top to bottom. */
export interface ItemCard {
  rarity: Rarity;
  /** Icon names to try in order (unique, then base); a placeholder if none loads. */
  icons: string[];
  /** Placeholder letter of the item type. */
  letter: string;
  name: string;
  /** Rare only: the base name under the random name. */
  baseName?: string;
  subtitle: string;
  typeLine: string;
  baseLine?: string;
  affixLines: string[];
  flavor?: string;
}

export function describeItem(data: ItemData, item: Item): ItemCard {
  const base = data.baseById.get(item.base);
  const unique = item.unique ? data.uniqueById.get(item.unique) : undefined;
  const typeLine = base ? TYPE_NAMES[base.type] : '';
  const card: ItemCard = {
    rarity: item.rarity,
    icons: [unique?.icon, base?.icon].filter((s): s is string => !!s),
    letter: typeLine.charAt(0),
    name: itemName(data, item),
    subtitle: `${RARITY_NAMES[item.rarity]} артефакт · рівень ${item.ilvl}`,
    typeLine,
    affixLines: item.affixes.flatMap((a) => {
      const stat = 'id' in a ? data.affixById.get(a.id)?.stat : a.stat;
      return stat ? [STAT_LINES[stat](a.value)] : [];
    }),
  };
  if (item.rarity === 'rare' && base) card.baseName = base.name;
  if (base?.damage) card.baseLine = `Шкода: ${base.damage[0]}–${base.damage[1]}`;
  else if (base?.armor !== undefined) card.baseLine = `Броня: ${base.armor}`;
  if (unique?.flavor) card.flavor = unique.flavor;
  return card;
}

/** Ukrainian plural of «артефакт» for a count. */
function artifacts(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return `${n} артефакт`;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return `${n} артефакти`;
  return `${n} артефактів`;
}

/** Hover label of a loot sack: «Мішечок: 12 золота, 2 артефакти». */
export function sackLabel(gold: number, items: Item[]): string {
  const parts = [];
  if (gold > 0) parts.push(`${gold} золота`);
  if (items.length > 0) parts.push(artifacts(items.length));
  return `Мішечок: ${parts.join(', ')}`;
}

/** Highest rarity among the items ('common' for none). */
export function topRarity(items: Item[]): Rarity {
  let top = 0;
  for (const i of items) top = Math.max(top, RARITIES.indexOf(i.rarity));
  return RARITIES[top];
}
