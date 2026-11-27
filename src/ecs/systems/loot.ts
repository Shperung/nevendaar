import { addComponent, defineQuery, hasComponent, Not, type IWorld } from 'bitecs';
import { BACKPACK_CAP, FIXED_DT, ZONE_GOLD_MULT } from '../../config';
import { rollItem } from '../../gameplay/ItemGenerator';
import type { Item, ItemData } from '../../gameplay/Items';
import { dropPosition, rollGold, type LootTable } from '../../gameplay/Loot';
import type { Rng } from '../../gameplay/Random';
import { isWalkable, type GameMap } from '../../map/GameMap';
import { Backpack } from '../components/Backpack';
import { Dead } from '../components/Dead';
import { GoldDrop } from '../components/GoldDrop';
import { GoldPile } from '../components/GoldPile';
import { ItemDrop } from '../components/ItemDrop';
import { Player } from '../components/Player';
import { Position } from '../components/Position';
import { SackItems } from '../components/SackItems';
import { Wallet } from '../components/Wallet';
import { spawnGoldPile } from '../world';

const dyingQuery = defineQuery([Dead, Position]);
const pileQuery = defineQuery([GoldPile, Position, Not(Dead)]);
const heroQuery = defineQuery([Player, Wallet, Position, Not(Dead)]);

/**
 * Dying monsters roll their gold, then their artifacts (once: cleanup removes them this same step),
 * and leave everything in one pile; piles ripen for `pickupDelay` seconds, then the hero within
 * `pickupRadius` collects them: gold into the wallet, artifacts to the end of the backpack.
 * `firstUid` is the next free item uid (one above the saved ones).
 */
export function createLootSystem(
  map: GameMap,
  rng: Rng,
  loot: LootTable,
  items: ItemData,
  firstUid: number,
): (world: IWorld) => void {
  const walkable = (x: number, y: number) => isWalkable(map, x, y);
  const { pickup } = loot;
  let uid = firstUid;

  return (world) => {
    for (const eid of dyingQuery(world)) {
      const hasGold = hasComponent(world, GoldDrop, eid);
      const hasItems = hasComponent(world, ItemDrop, eid);
      if (!hasGold && !hasItems) continue;
      const def = {
        chance: GoldDrop.chance[eid],
        base: GoldDrop.base[eid],
        spread: GoldDrop.spread[eid],
      };
      const amount = hasGold ? rollGold(def, rng, ZONE_GOLD_MULT) : 0;
      const drops: Item[] = [];
      for (let i = 0; hasItems && i < ItemDrop.rolls[eid]; i++) {
        if (rng() >= ItemDrop.chance[eid]) continue;
        drops.push(rollItem(items, loot.rarity, ItemDrop.ilvl[eid], rng, uid++));
      }
      if (amount === 0 && drops.length === 0) continue;
      const p = dropPosition(Position.x[eid], Position.y[eid], rng, walkable);
      spawnGoldPile(world, p.x, p.y, amount, pickup.pickupDelay, drops);
    }

    const piles = pileQuery(world);
    for (const eid of piles) GoldPile.delay[eid] = Math.max(0, GoldPile.delay[eid] - FIXED_DT);

    for (const hero of heroQuery(world)) {
      for (const eid of piles) {
        if (GoldPile.delay[eid] > 0) continue;
        const d = Math.hypot(
          Position.x[eid] - Position.x[hero],
          Position.y[eid] - Position.y[hero],
        );
        if (d > pickup.pickupRadius) continue;
        Wallet.gold[hero] = Math.min(
          Number.MAX_SAFE_INTEGER,
          Wallet.gold[hero] + GoldPile.amount[eid],
        );
        const sack = SackItems.get(eid);
        if (sack) {
          let pack = Backpack.get(hero);
          if (!pack) Backpack.set(hero, (pack = []));
          const room = Math.max(0, BACKPACK_CAP - pack.length);
          if (sack.length > room) console.warn(`backpack full: ${sack.length - room} items lost`);
          pack.push(...sack.slice(0, room));
        }
        addComponent(world, Dead, eid);
      }
    }
  };
}
