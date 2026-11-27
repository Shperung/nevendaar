export const RARITIES = ['common', 'magic', 'rare', 'unique'] as const;
export type Rarity = (typeof RARITIES)[number];

/** Same ids as the slot `accepts` lists in inventory.json. */
export const ITEM_TYPES = [
  'weapon1h',
  'weapon2h',
  'shield',
  'helm',
  'armor',
  'gloves',
  'belt',
  'boots',
  'ring',
  'amulet',
] as const;
export type ItemType = (typeof ITEM_TYPES)[number];

export const STATS = [
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
export type Stat = (typeof STATS)[number];

/** Grammatical gender of a base name; prefix adjectives agree with it. */
export const GENDERS = ['m', 'f', 'pl'] as const;
export type Gender = (typeof GENDERS)[number];

export interface BaseDef {
  id: string;
  name: string;
  gender: Gender;
  type: ItemType;
  /** Lowest item level the base drops at. */
  qlvl: number;
  weight: number;
  damage?: [number, number];
  armor?: number;
  icon: string;
}

export interface StatRange {
  stat: Stat;
  min: number;
  max: number;
}

export interface UniqueDef {
  id: string;
  name: string;
  base: string;
  minIlvl: number;
  weight: number;
  stats: StatRange[];
  flavor?: string;
  icon: string;
}

export interface AffixTier {
  minIlvl: number;
  min: number;
  max: number;
}

export interface AffixDef {
  id: string;
  kind: 'prefix' | 'suffix';
  /** At most one affix of a group per item. */
  group: string;
  stat: Stat;
  weight: number;
  types: ItemType[];
  /** Prefix: adjective forms per gender; suffix: the same genitive noun in all three. */
  names: Record<Gender, string>;
  /** Ordered by ascending minIlvl. */
  tiers: AffixTier[];
}

export interface ItemData {
  bases: BaseDef[];
  uniques: UniqueDef[];
  affixes: AffixDef[];
  rareNames: { first: string[]; second: string[] };
  baseById: Map<string, BaseDef>;
  uniqueById: Map<string, UniqueDef>;
  affixById: Map<string, AffixDef>;
}

/** Rolled affix of a magic/rare item (`tier` indexes AffixDef.tiers) or a rolled unique stat. */
export type ItemAffix = { id: string; tier: number; value: number } | { stat: Stat; value: number };

/** A rolled artifact; only the roll result is stored, so it survives changes of the tables. */
export interface Item {
  uid: number;
  base: string;
  rarity: Rarity;
  ilvl: number;
  affixes: ItemAffix[];
  unique?: string;
  /** Indices into rareNames.first / rareNames.second. */
  rareName?: [number, number];
}

export const ITEMS_URL = 'assets/data/items.json';
export const AFFIXES_URL = 'assets/data/affixes.json';

type Fail = (msg: string) => never;

function failer(file: string): Fail {
  return (msg) => {
    throw new Error(`${file}: ${msg}`);
  };
}

function obj(value: unknown, path: string, fail: Fail): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function arr(value: unknown, path: string, fail: Fail): unknown[] {
  if (!Array.isArray(value)) fail(`${path} must be an array`);
  return value as unknown[];
}

function str(value: unknown, path: string, fail: Fail): string {
  if (typeof value !== 'string' || value === '') fail(`${path} must be a non-empty string`);
  return value as string;
}

function int(value: unknown, path: string, fail: Fail, min = 0): number {
  if (!Number.isInteger(value) || (value as number) < min) {
    fail(`invalid ${path}: ${JSON.stringify(value)}`);
  }
  return value as number;
}

function oneOf<T extends string>(list: readonly T[], value: unknown, path: string, fail: Fail): T {
  if (!list.includes(value as T)) fail(`unknown ${path}: ${JSON.stringify(value)}`);
  return value as T;
}

function range(min: unknown, max: unknown, path: string, fail: Fail): [number, number] {
  const lo = int(min, `${path}.min`, fail);
  const hi = int(max, `${path}.max`, fail);
  if (lo > hi) fail(`${path}: min > max`);
  return [lo, hi];
}

function strings(value: unknown, path: string, fail: Fail): string[] {
  const list = arr(value, path, fail);
  if (list.length === 0) fail(`${path} must not be empty`);
  return list.map((s, i) => str(s, `${path}[${i}]`, fail));
}

function unique<T extends { id: string }>(list: T[], what: string, fail: Fail): Map<string, T> {
  const map = new Map<string, T>();
  for (const e of list) {
    if (map.has(e.id)) fail(`duplicate ${what} id "${e.id}"`);
    map.set(e.id, e);
  }
  return map;
}

function parseBase(entry: unknown, i: number, fail: Fail): BaseDef {
  const p = `bases[${i}]`;
  const b = obj(entry, p, fail);
  const base: BaseDef = {
    id: str(b.id, `${p}.id`, fail),
    name: str(b.name, `${p}.name`, fail),
    gender: oneOf(GENDERS, b.gender, `${p}.gender`, fail),
    type: oneOf(ITEM_TYPES, b.type, `${p}.type`, fail),
    qlvl: int(b.qlvl, `${p}.qlvl`, fail, 1),
    weight: int(b.weight, `${p}.weight`, fail, 1),
    icon: str(b.icon, `${p}.icon`, fail),
  };
  if (b.damage !== undefined) {
    const d = arr(b.damage, `${p}.damage`, fail);
    if (d.length !== 2) fail(`${p}.damage must be [min, max]`);
    base.damage = range(d[0], d[1], `${p}.damage`, fail);
  }
  if (b.armor !== undefined) base.armor = int(b.armor, `${p}.armor`, fail);
  return base;
}

function parseUnique(
  entry: unknown,
  i: number,
  bases: Map<string, BaseDef>,
  fail: Fail,
): UniqueDef {
  const p = `uniques[${i}]`;
  const u = obj(entry, p, fail);
  const base = str(u.base, `${p}.base`, fail);
  if (!bases.has(base)) fail(`${p}.base "${base}" is not a base id`);
  const stats = arr(u.stats, `${p}.stats`, fail).map((entry, j): StatRange => {
    const s = obj(entry, `${p}.stats[${j}]`, fail);
    const [min, max] = range(s.min, s.max, `${p}.stats[${j}]`, fail);
    return { stat: oneOf(STATS, s.stat, `${p}.stats[${j}].stat`, fail), min, max };
  });
  if (stats.length === 0) fail(`${p}.stats must not be empty`);
  const def: UniqueDef = {
    id: str(u.id, `${p}.id`, fail),
    name: str(u.name, `${p}.name`, fail),
    base,
    minIlvl: int(u.minIlvl, `${p}.minIlvl`, fail, 1),
    weight: int(u.weight, `${p}.weight`, fail, 1),
    stats,
    icon: str(u.icon, `${p}.icon`, fail),
  };
  if (u.flavor !== undefined) def.flavor = str(u.flavor, `${p}.flavor`, fail);
  return def;
}

function parseAffix(entry: unknown, i: number, fail: Fail): AffixDef {
  const p = `[${i}]`;
  const a = obj(entry, p, fail);
  const kind = oneOf(['prefix', 'suffix'] as const, a.kind, `${p}.kind`, fail);
  let names: Record<Gender, string>;
  if (kind === 'prefix') {
    const n = obj(a.names, `${p}.names`, fail);
    names = { m: '', f: '', pl: '' };
    for (const g of GENDERS) names[g] = str(n[g], `${p}.names.${g}`, fail);
  } else {
    const name = str(a.name, `${p}.name`, fail);
    names = { m: name, f: name, pl: name };
  }
  const types = arr(a.types, `${p}.types`, fail).map((t, j) =>
    oneOf(ITEM_TYPES, t, `${p}.types[${j}]`, fail),
  );
  if (types.length === 0) fail(`${p}.types must not be empty`);
  const tiers = arr(a.tiers, `${p}.tiers`, fail).map((entry, j): AffixTier => {
    const t = obj(entry, `${p}.tiers[${j}]`, fail);
    const [min, max] = range(t.min, t.max, `${p}.tiers[${j}]`, fail);
    return { minIlvl: int(t.minIlvl, `${p}.tiers[${j}].minIlvl`, fail, 1), min, max };
  });
  if (tiers.length === 0) fail(`${p}.tiers must not be empty`);
  tiers.forEach((t, j) => {
    if (j > 0 && t.minIlvl <= tiers[j - 1].minIlvl) fail(`${p}.tiers must grow by minIlvl`);
  });
  return {
    id: str(a.id, `${p}.id`, fail),
    kind,
    group: str(a.group, `${p}.group`, fail),
    stat: oneOf(STATS, a.stat, `${p}.stat`, fail),
    weight: int(a.weight, `${p}.weight`, fail, 1),
    types,
    names,
    tiers,
  };
}

/** Validates items.json and affixes.json together (uniques must point at existing bases). */
export function parseItemData(itemsJson: unknown, affixesJson: unknown): ItemData {
  const fi = failer('items.json');
  const root = obj(itemsJson, 'root', fi);
  const bases = arr(root.bases, 'bases', fi).map((e, i) => parseBase(e, i, fi));
  if (bases.length === 0) fi('bases must not be empty');
  const baseById = unique(bases, 'base', fi);
  const uniques = arr(root.uniques, 'uniques', fi).map((e, i) => parseUnique(e, i, baseById, fi));
  const uniqueById = unique(uniques, 'unique', fi);
  const rn = obj(root.rareNames, 'rareNames', fi);
  const rareNames = {
    first: strings(rn.first, 'rareNames.first', fi),
    second: strings(rn.second, 'rareNames.second', fi),
  };

  const fa = failer('affixes.json');
  const affixes = arr(affixesJson, 'root', fa).map((e, i) => parseAffix(e, i, fa));
  const affixById = unique(affixes, 'affix', fa);
  return { bases, uniques, affixes, rareNames, baseById, uniqueById, affixById };
}

/** One saved item checked against the current tables; a reason string if it no longer fits. */
function restoreItem(raw: unknown, data: ItemData): Item | string {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return 'not an object';
  const r = raw as Record<string, unknown>;
  if (!Number.isSafeInteger(r.uid) || (r.uid as number) < 1) return 'bad uid';
  if (typeof r.base !== 'string' || !data.baseById.has(r.base)) return `unknown base ${r.base}`;
  if (!RARITIES.includes(r.rarity as Rarity)) return `unknown rarity ${r.rarity}`;
  if (!Number.isInteger(r.ilvl) || (r.ilvl as number) < 1) return 'bad ilvl';
  if (!Array.isArray(r.affixes)) return 'bad affixes';
  const item: Item = {
    uid: r.uid as number,
    base: r.base,
    rarity: r.rarity as Rarity,
    ilvl: r.ilvl as number,
    affixes: [],
  };
  for (const a of r.affixes as unknown[]) {
    if (typeof a !== 'object' || a === null) return 'bad affix';
    const { id, tier, stat, value } = a as Record<string, unknown>;
    if (typeof value !== 'number' || !Number.isFinite(value)) return 'bad affix value';
    if (typeof id === 'string') {
      const def = data.affixById.get(id);
      if (!def) return `unknown affix ${id}`;
      if (!Number.isInteger(tier) || !def.tiers[tier as number]) return `bad tier of ${id}`;
      item.affixes.push({ id, tier: tier as number, value });
    } else if (STATS.includes(stat as Stat)) {
      item.affixes.push({ stat: stat as Stat, value });
    } else return 'bad affix';
  }
  if (item.rarity === 'unique') {
    if (typeof r.unique !== 'string' || !data.uniqueById.has(r.unique)) {
      return `unknown unique ${r.unique}`;
    }
    item.unique = r.unique;
  }
  if (item.rarity === 'rare') {
    const n = r.rareName;
    if (
      !Array.isArray(n) ||
      data.rareNames.first[n[0]] === undefined ||
      data.rareNames.second[n[1]] === undefined
    ) {
      return 'bad rareName';
    }
    item.rareName = [n[0], n[1]];
  }
  return item;
}

/** Saved inventory → items; entries that no longer match the tables are dropped with a warning. */
export function restoreItems(raw: unknown, data: ItemData): Item[] {
  if (!Array.isArray(raw)) return [];
  const items: Item[] = [];
  for (const entry of raw) {
    const r = restoreItem(entry, data);
    if (typeof r === 'string') console.warn(`inventory: item skipped (${r})`, entry);
    else items.push(r);
  }
  return items;
}
