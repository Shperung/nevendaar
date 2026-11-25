import { addComponent, addEntity, createWorld, type IWorld } from 'bitecs';
import { UnitId } from '../assets/manifest';
import { HERO_ATTACK, HERO_HP, HERO_SPEED, MONSTER_LEASH_FACTOR } from '../config';
import type { GoldDef, PickupParams } from '../gameplay/Loot';
import type { MonsterDef } from '../gameplay/Monster';
import type { Rng } from '../gameplay/Random';
import type { GameMap } from '../map/GameMap';
import type { Point } from '../map/Pathfinder';
import { AI } from './components/AI';
import { Attack } from './components/Attack';
import { GoldDrop } from './components/GoldDrop';
import { GoldPile } from './components/GoldPile';
import { Health } from './components/Health';
import { Player } from './components/Player';
import { Position } from './components/Position';
import { Speed } from './components/Speed';
import { Sprite } from './components/Sprite';
import { Wallet } from './components/Wallet';
import { aiSystem } from './systems/ai';
import { animationSystem } from './systems/animation';
import { createCleanupSystem } from './systems/cleanup';
import { createCombatSystem } from './systems/combat';
import { createInputSystem } from './systems/input';
import { createLootSystem } from './systems/loot';
import { movementSystem } from './systems/movement';

export function createGameWorld(): IWorld {
  return createWorld();
}

/** Fixed-step systems, in order: input → ai → movement → combat → loot → ... (see AGENTS.md §4). */
export function createStep(
  map: GameMap,
  heroSpawn: Point,
  rng: Rng,
  pickup: PickupParams,
): (world: IWorld) => void {
  const inputSystem = createInputSystem(map);
  const combatSystem = createCombatSystem(map);
  const lootSystem = createLootSystem(map, rng, pickup);
  const cleanupSystem = createCleanupSystem(heroSpawn);
  return (world) => {
    inputSystem(world);
    aiSystem(world);
    movementSystem(world);
    combatSystem(world);
    lootSystem(world);
    animationSystem(world);
    cleanupSystem(world);
  };
}

export function spawnHero(world: IWorld, x: number, y: number, gold: number): number {
  const eid = addEntity(world);
  addComponent(world, Player, eid);
  addComponent(world, Wallet, eid);
  Wallet.gold[eid] = gold;
  addComponent(world, Position, eid);
  addComponent(world, Speed, eid);
  addComponent(world, Sprite, eid);
  addComponent(world, Attack, eid);
  addComponent(world, Health, eid);
  Position.x[eid] = Position.prevX[eid] = x;
  Position.y[eid] = Position.prevY[eid] = y;
  Speed.value[eid] = HERO_SPEED;
  Sprite.unit[eid] = UnitId.Hero;
  Sprite.dir[eid] = 4; // S, facing the camera
  Attack.damage[eid] = HERO_ATTACK.damage;
  Attack.range[eid] = HERO_ATTACK.range;
  Attack.cooldown[eid] = HERO_ATTACK.cooldown;
  Health.current[eid] = Health.max[eid] = HERO_HP;
  return eid;
}

export function spawnMonster(
  world: IWorld,
  unit: number,
  x: number,
  y: number,
  dir: number,
  def: MonsterDef,
  gold?: GoldDef,
): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Sprite, eid);
  addComponent(world, Health, eid);
  addComponent(world, Speed, eid);
  addComponent(world, Attack, eid);
  addComponent(world, AI, eid);
  Position.x[eid] = Position.prevX[eid] = x;
  Position.y[eid] = Position.prevY[eid] = y;
  Sprite.unit[eid] = unit;
  Sprite.dir[eid] = dir;
  Health.current[eid] = Health.max[eid] = def.hp;
  Speed.value[eid] = def.speed;
  Attack.damage[eid] = def.damage;
  Attack.range[eid] = def.range;
  Attack.cooldown[eid] = def.cooldown;
  AI.aggro[eid] = def.aggro;
  AI.leash[eid] = def.aggro * MONSTER_LEASH_FACTOR;
  if (gold) {
    addComponent(world, GoldDrop, eid);
    GoldDrop.chance[eid] = gold.chance;
    GoldDrop.base[eid] = gold.base;
    GoldDrop.spread[eid] = gold.spread;
  }
  return eid;
}

export function spawnGoldPile(
  world: IWorld,
  x: number,
  y: number,
  amount: number,
  delay: number,
): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, GoldPile, eid);
  Position.x[eid] = Position.prevX[eid] = x;
  Position.y[eid] = Position.prevY[eid] = y;
  GoldPile.amount[eid] = amount;
  GoldPile.delay[eid] = delay;
  return eid;
}
