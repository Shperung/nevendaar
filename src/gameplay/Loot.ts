import { GOLD_PILE_TIERS, GOLD_SCATTER } from '../config';
import type { Rng } from './Random';

/** Gold drop of one monster type: `chance` in [0, 1], amount = `base` ± `spread` (fraction of base). */
export interface GoldDef {
  chance: number;
  base: number;
  spread: number;
}

/** Piles can be picked up `pickupDelay` seconds after the drop, within `pickupRadius` tiles. */
export interface PickupParams {
  pickupDelay: number;
  pickupRadius: number;
}

export interface LootTable {
  pickup: PickupParams;
  monsters: Record<string, { gold?: GoldDef }>;
}

export const LOOT_URL = 'assets/data/loot.json';

function num(value: unknown, path: string, min: number, max = Infinity, maxIncl = true): number {
  const ok =
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= min &&
    (maxIncl ? value <= max : value < max);
  if (!ok) throw new Error(`loot.json: invalid ${path}: ${JSON.stringify(value)}`);
  return value;
}

function obj(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error(`loot.json: ${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

/** Validates loot.json; keys starting with `_` are service entries, the rest are monster ids. */
export function parseLoot(json: unknown): LootTable {
  const root = obj(json, 'root');
  const p = obj(root._pickup, '_pickup');
  const pickup = {
    pickupDelay: num(p.pickupDelay, '_pickup.pickupDelay', 0),
    pickupRadius: num(p.pickupRadius, '_pickup.pickupRadius', 0),
  };
  const monsters: LootTable['monsters'] = {};
  for (const [id, entry] of Object.entries(root)) {
    if (id.startsWith('_')) continue;
    const e = obj(entry, id);
    if (e.gold === undefined) {
      monsters[id] = {};
      continue;
    }
    const g = obj(e.gold, `${id}.gold`);
    monsters[id] = {
      gold: {
        chance: num(g.chance, `${id}.gold.chance`, 0, 1),
        base: num(g.base, `${id}.gold.base`, 0),
        spread: num(g.spread, `${id}.gold.spread`, 0, 1, false),
      },
    };
  }
  return { pickup, monsters };
}

/**
 * Rolls a monster's gold drop: 0 if the chance roll fails, else
 * max(1, floor(round(base · (1 + U)) · mult)) with U uniform in [-spread, +spread).
 * The amount roll is made only on success, so the RNG sequence stays reproducible.
 */
export function rollGold(def: GoldDef, rng: Rng, mult: number): number {
  if (rng() >= def.chance) return 0;
  const u = (rng() * 2 - 1) * def.spread;
  return Math.max(1, Math.floor(Math.round(def.base * (1 + u)) * mult));
}

/** Death spot shifted by up to GOLD_SCATTER tiles; falls back to the exact spot on a blocked tile. */
export function dropPosition(
  x: number,
  y: number,
  rng: Rng,
  walkable: (x: number, y: number) => boolean,
): { x: number; y: number } {
  // sqrt keeps the points uniform over the disc instead of clustering at the center.
  const r = Math.sqrt(rng()) * GOLD_SCATTER;
  const a = rng() * 2 * Math.PI;
  const px = x + Math.cos(a) * r;
  const py = y + Math.sin(a) * r;
  return walkable(px, py) ? { x: px, y: py } : { x, y };
}

/** Visual pile size: 0 small, 1 medium, 2 large. */
export function pileTier(amount: number): number {
  return amount <= GOLD_PILE_TIERS[0] ? 0 : amount <= GOLD_PILE_TIERS[1] ? 1 : 2;
}
