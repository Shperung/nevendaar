import { addComponent, defineQuery, hasComponent, type IWorld } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import { BACKPACK_CAP, FIXED_DT } from '../../src/config';
import AFFIXES from '../../public/assets/data/affixes.json';
import ITEMS from '../../public/assets/data/items.json';
import { createGameWorld, spawnGoldPile, spawnHero, spawnMonster } from '../../src/ecs/world';
import { Backpack } from '../../src/ecs/components/Backpack';
import { Dead } from '../../src/ecs/components/Dead';
import { GoldPile } from '../../src/ecs/components/GoldPile';
import { SackItems } from '../../src/ecs/components/SackItems';
import { Wallet } from '../../src/ecs/components/Wallet';
import { createLootSystem } from '../../src/ecs/systems/loot';
import { parseItemData, type Item } from '../../src/gameplay/Items';
import { mulberry32 } from '../../src/gameplay/Random';
import { parseAsciiMap } from '../../src/map/GameMap';

const MAP = parseAsciiMap(['.....', '.....', '.....', '.....', '.....']);
const PICKUP = { pickupDelay: 2, pickupRadius: 0.6 };
const LOOT = {
  pickup: PICKUP,
  rarity: { common: 60, magic: 30, rare: 9, unique: 1 },
  monsters: {},
};
const DATA = parseItemData(ITEMS, AFFIXES);
const DEF = { level: 2, hp: 10, speed: 1, damage: 1, range: 1, cooldown: 1, aggro: 0 };
const item = (uid: number): Item => ({
  uid,
  base: 'rusted_helm',
  rarity: 'common',
  ilvl: 1,
  affixes: [],
});
const pileQuery = defineQuery([GoldPile]);
const DELAY_STEPS = Math.ceil(PICKUP.pickupDelay / FIXED_DT);

function setup() {
  const world = createGameWorld();
  const loot = createLootSystem(MAP, mulberry32(1), LOOT, DATA, 1);
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

  it('puts gold and artifacts of one monster into one sack', () => {
    const { world, loot } = setup();
    const m = spawnMonster(
      world,
      1,
      2.5,
      2.5,
      0,
      DEF,
      { chance: 1, base: 10, spread: 0 },
      { rolls: 2, chance: 1 },
    );
    addComponent(world, Dead, m);
    loot(world);
    const piles = pileQuery(world);
    expect(piles.length).toBe(1);
    expect(GoldPile.amount[piles[0]]).toBe(10);
    const sack = SackItems.get(piles[0]);
    expect(sack?.map((i) => i.uid)).toEqual([1, 2]);
    expect(sack?.every((i) => i.ilvl === DEF.level)).toBe(true);
  });

  it('drops a gold-only pile without SackItems and nothing when nothing dropped', () => {
    const { world, loot } = setup();
    const gold = spawnMonster(
      world,
      1,
      2.5,
      2.5,
      0,
      DEF,
      { chance: 1, base: 5, spread: 0 },
      {
        rolls: 1,
        chance: 0,
      },
    );
    const none = spawnMonster(
      world,
      1,
      1.5,
      1.5,
      0,
      DEF,
      { chance: 0, base: 5, spread: 0 },
      {
        rolls: 1,
        chance: 0,
      },
    );
    addComponent(world, Dead, gold);
    addComponent(world, Dead, none);
    loot(world);
    const piles = pileQuery(world);
    expect(piles.length).toBe(1);
    expect(SackItems.has(piles[0])).toBe(false);
  });

  it('adds sack items to the end of the backpack and gold to the wallet', () => {
    const { world, run } = setup();
    const hero = spawnHero(world, 2.5, 2.5, 1, [item(1)]);
    spawnGoldPile(world, 2.5, 2.5, 4, 0, [item(2), item(3)]);
    run(world, 1);
    expect(Wallet.gold[hero]).toBe(5);
    expect(Backpack.get(hero)?.map((i) => i.uid)).toEqual([1, 2, 3]);
  });

  it('never grows the backpack past BACKPACK_CAP', () => {
    const { world, run } = setup();
    const full = Array.from({ length: BACKPACK_CAP - 1 }, (_, i) => item(i + 1));
    const hero = spawnHero(world, 2.5, 2.5, 0, full);
    spawnGoldPile(world, 2.5, 2.5, 0, 0, [item(BACKPACK_CAP), item(BACKPACK_CAP + 1)]);
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    run(world, 1);
    expect(Backpack.get(hero)?.length).toBe(BACKPACK_CAP);
    expect(warn).toHaveBeenCalledOnce();
    warn.mockRestore();
  });
});
