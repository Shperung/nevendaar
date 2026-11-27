import {
  RARITIES,
  type AffixDef,
  type BaseDef,
  type Item,
  type ItemAffix,
  type ItemData,
  type Rarity,
} from './Items';
import type { Rng } from './Random';

/** Weighted pick: each entry wins with probability weight / sum of weights. */
export function weighted<T>(rng: Rng, entries: T[], weight: (e: T) => number): T {
  const total = entries.reduce((s, e) => s + weight(e), 0);
  let r = rng() * total;
  for (const e of entries) {
    r -= weight(e);
    if (r < 0) return e;
  }
  return entries[entries.length - 1];
}

/** Uniform whole number in [min, max]. */
function intIn(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

type Kind = AffixDef['kind'];

/**
 * Rolls the affixes of a magic (1–2, at most 1 + 1) or rare (3–4, at most 2 + 2) item. A kind
 * with nothing left to roll is skipped, so the item may end up with fewer affixes.
 */
function rollAffixes(
  data: ItemData,
  base: BaseDef,
  ilvl: number,
  rng: Rng,
  rare: boolean,
): ItemAffix[] {
  const groups = new Set<string>();
  const used = { prefix: 0, suffix: 0 };
  const cap = rare ? 2 : 1;
  const pool = (kind: Kind) =>
    data.affixes.filter(
      (a) =>
        a.kind === kind &&
        a.types.includes(base.type) &&
        a.tiers[0].minIlvl <= ilvl &&
        !groups.has(a.group),
    );
  const affixes: ItemAffix[] = [];
  const roll = (kind: Kind) => {
    const candidates = pool(kind);
    if (candidates.length === 0) return;
    const a = weighted(rng, candidates, (c) => c.weight);
    // Tiers are sorted by minIlvl, so the open ones are a prefix of the list; all equally likely.
    const open = a.tiers.filter((t) => t.minIlvl <= ilvl).length;
    const tier = Math.floor(rng() * open);
    affixes.push({ id: a.id, tier, value: intIn(rng, a.tiers[tier].min, a.tiers[tier].max) });
    groups.add(a.group);
    used[kind]++;
  };

  const count = rare ? (rng() < 0.5 ? 3 : 4) : rng() < 0.5 ? 1 : 2;
  if (!rare && count === 2) {
    roll('prefix');
    roll('suffix');
    return affixes;
  }
  for (let i = 0; i < count; i++) {
    const kinds = (['prefix', 'suffix'] as const).filter(
      (k) => used[k] < cap && pool(k).length > 0,
    );
    if (kinds.length === 0) break;
    roll(kinds.length === 1 ? kinds[0] : rng() < 0.5 ? 'prefix' : 'suffix');
  }
  return affixes;
}

/**
 * Rolls one artifact of item level `ilvl`, in a fixed order so a seed reproduces it:
 * base → rarity → unique stats or affixes → rare name. A unique with no unique available for the
 * base becomes rare; a magic/rare that got no affixes becomes common.
 */
export function rollItem(
  data: ItemData,
  rarityWeights: Record<Rarity, number>,
  ilvl: number,
  rng: Rng,
  uid: number,
): Item {
  const open = data.bases.filter((b) => b.qlvl <= ilvl);
  const base = weighted(rng, open.length > 0 ? open : data.bases, (b) => b.weight);
  let rarity = weighted(rng, [...RARITIES], (r) => rarityWeights[r]);
  const item: Item = { uid, base: base.id, rarity, ilvl, affixes: [] };

  if (rarity === 'unique') {
    const uniques = data.uniques.filter((u) => u.base === base.id && u.minIlvl <= ilvl);
    if (uniques.length > 0) {
      const u = weighted(rng, uniques, (c) => c.weight);
      item.unique = u.id;
      item.affixes = u.stats.map((s) => ({ stat: s.stat, value: intIn(rng, s.min, s.max) }));
      return item;
    }
    rarity = 'rare';
  }
  if (rarity === 'common') return item;

  item.affixes = rollAffixes(data, base, ilvl, rng, rarity === 'rare');
  item.rarity = item.affixes.length > 0 ? rarity : 'common';
  if (item.rarity === 'rare') {
    const { first, second } = data.rareNames;
    item.rareName = [Math.floor(rng() * first.length), Math.floor(rng() * second.length)];
  }
  return item;
}
