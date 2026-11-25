import { addComponent, defineQuery, hasComponent, type IWorld } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { FIXED_DT } from '../../src/config';
import { createGameWorld, spawnGoldPile, spawnHero, spawnMonster } from '../../src/ecs/world';
import { Dead } from '../../src/ecs/components/Dead';
import { GoldPile } from '../../src/ecs/components/GoldPile';
import { Wallet } from '../../src/ecs/components/Wallet';
import { createLootSystem } from '../../src/ecs/systems/loot';
import { mulberry32 } from '../../src/gameplay/Random';
import { parseAsciiMap } from '../../src/map/GameMap';

const MAP = parseAsciiMap(['.....', '.....', '.....', '.....', '.....']);
const PICKUP = { pickupDelay: 2, pickupRadius: 0.6 };
const DEF = { hp: 10, speed: 1, damage: 1, range: 1, cooldown: 1, aggro: 0 };
const pileQuery = defineQuery([GoldPile]);
const DELAY_STEPS = Math.ceil(PICKUP.pickupDelay / FIXED_DT);

function setup() {
  const world = createGameWorld();
  const loot = createLootSystem(MAP, mulberry32(1), PICKUP);
  const run = (w: IWorld, steps: number) => {
    for (let i = 0; i < steps; i++) loot(w);
  };
  return { world, loot, run };
}

describe('loot system', () => {
  it('drops a pile from a dying monster with GoldDrop', () => {
    const { world, loot } = setup();
    const m = spawnMonster(world, 1, 2.5, 2.5, 0, DEF, { chance: 1, base: 10, spread: 0 });
    addComponent(world, Dead, m);
    loot(world);
    const piles = pileQuery(world);
    expect(piles.length).toBe(1);
    expect(GoldPile.amount[piles[0]]).toBe(10);
  });

  it('picks up only ripe piles within the radius', () => {
    const { world, run } = setup();
    const hero = spawnHero(world, 2.5, 2.5, 5);
    const near = spawnGoldPile(world, 2.7, 2.5, 3, PICKUP.pickupDelay);
    const far = spawnGoldPile(world, 4.5, 4.5, 7, PICKUP.pickupDelay);
    run(world, DELAY_STEPS - 2);
    expect(Wallet.gold[hero]).toBe(5);
    // f32 rounding of the countdown may need one extra step.
    run(world, 3);
    expect(Wallet.gold[hero]).toBe(8);
    expect(hasComponent(world, Dead, near)).toBe(true);
    expect(hasComponent(world, Dead, far)).toBe(false);
  });

  it('a dead hero does not pick up', () => {
    const { world, run } = setup();
    const hero = spawnHero(world, 2.5, 2.5, 0);
    spawnGoldPile(world, 2.5, 2.5, 3, 0);
    addComponent(world, Dead, hero);
    run(world, 1);
    expect(Wallet.gold[hero]).toBe(0);
  });
});
