import { addComponent, defineQuery, Not, type IWorld } from 'bitecs';
import { FIXED_DT, ZONE_GOLD_MULT } from '../../config';
import { dropPosition, rollGold, type PickupParams } from '../../gameplay/Loot';
import type { Rng } from '../../gameplay/Random';
import { isWalkable, type GameMap } from '../../map/GameMap';
import { Dead } from '../components/Dead';
import { GoldDrop } from '../components/GoldDrop';
import { GoldPile } from '../components/GoldPile';
import { Player } from '../components/Player';
import { Position } from '../components/Position';
import { Wallet } from '../components/Wallet';
import { spawnGoldPile } from '../world';

const dyingQuery = defineQuery([Dead, GoldDrop, Position]);
const pileQuery = defineQuery([GoldPile, Position, Not(Dead)]);
const heroQuery = defineQuery([Player, Wallet, Position, Not(Dead)]);

/**
 * Dying monsters roll their gold drop (once: cleanup removes them this same step);
 * piles ripen for `pickupDelay` seconds, then the hero within `pickupRadius` collects them.
 */
export function createLootSystem(
  map: GameMap,
  rng: Rng,
  pickup: PickupParams,
): (world: IWorld) => void {
  const walkable = (x: number, y: number) => isWalkable(map, x, y);

  return (world) => {
    for (const eid of dyingQuery(world)) {
      const def = {
        chance: GoldDrop.chance[eid],
        base: GoldDrop.base[eid],
        spread: GoldDrop.spread[eid],
      };
      const amount = rollGold(def, rng, ZONE_GOLD_MULT);
      if (amount === 0) continue;
      const p = dropPosition(Position.x[eid], Position.y[eid], rng, walkable);
      spawnGoldPile(world, p.x, p.y, amount, pickup.pickupDelay);
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
        addComponent(world, Dead, eid);
      }
    }
  };
}
