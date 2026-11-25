import { addComponent, addEntity, createWorld, type IWorld } from 'bitecs';
import { UnitId } from '../assets/manifest';
import { HERO_ATTACK, HERO_SPEED } from '../config';
import type { GameMap } from '../map/GameMap';
import { Attack } from './components/Attack';
import { Health } from './components/Health';
import { Player } from './components/Player';
import { Position } from './components/Position';
import { Speed } from './components/Speed';
import { Sprite } from './components/Sprite';
import { animationSystem } from './systems/animation';
import { cleanupSystem } from './systems/cleanup';
import { createCombatSystem } from './systems/combat';
import { createInputSystem } from './systems/input';
import { movementSystem } from './systems/movement';

export function createGameWorld(): IWorld {
  return createWorld();
}

/** Fixed-step systems, in order: input → ai → movement → combat → ... (see AGENTS.md §4). */
export function createStep(map: GameMap): (world: IWorld) => void {
  const inputSystem = createInputSystem(map);
  const combatSystem = createCombatSystem(map);
  return (world) => {
    inputSystem(world);
    movementSystem(world);
    combatSystem(world);
    animationSystem(world);
    cleanupSystem(world);
  };
}

export function spawnHero(world: IWorld, x: number, y: number): number {
  const eid = addEntity(world);
  addComponent(world, Player, eid);
  addComponent(world, Position, eid);
  addComponent(world, Speed, eid);
  addComponent(world, Sprite, eid);
  addComponent(world, Attack, eid);
  Position.x[eid] = Position.prevX[eid] = x;
  Position.y[eid] = Position.prevY[eid] = y;
  Speed.value[eid] = HERO_SPEED;
  Sprite.unit[eid] = UnitId.Hero;
  Sprite.dir[eid] = 4; // S, facing the camera
  Attack.damage[eid] = HERO_ATTACK.damage;
  Attack.range[eid] = HERO_ATTACK.range;
  Attack.cooldown[eid] = HERO_ATTACK.cooldown;
  return eid;
}

export function spawnMonster(
  world: IWorld,
  unit: number,
  x: number,
  y: number,
  dir: number,
  hp: number,
): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Sprite, eid);
  addComponent(world, Health, eid);
  Position.x[eid] = Position.prevX[eid] = x;
  Position.y[eid] = Position.prevY[eid] = y;
  Sprite.unit[eid] = unit;
  Sprite.dir[eid] = dir;
  Health.current[eid] = Health.max[eid] = hp;
  return eid;
}
