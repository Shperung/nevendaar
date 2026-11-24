import { addComponent, addEntity, createWorld, type IWorld } from 'bitecs';
import { UnitId } from '../assets/manifest';
import { HERO_SPEED } from '../config';
import type { GameMap } from '../map/GameMap';
import { Player } from './components/Player';
import { Position } from './components/Position';
import { Speed } from './components/Speed';
import { Sprite } from './components/Sprite';
import { animationSystem } from './systems/animation';
import { createInputSystem } from './systems/input';
import { movementSystem } from './systems/movement';

export function createGameWorld(): IWorld {
  return createWorld();
}

/** Fixed-step systems, in order: input → ai → movement → combat → ... (see AGENTS.md §4). */
export function createStep(map: GameMap): (world: IWorld) => void {
  const inputSystem = createInputSystem(map);
  return (world) => {
    inputSystem(world);
    movementSystem(world);
    animationSystem(world);
  };
}

export function spawnHero(world: IWorld, x: number, y: number): number {
  const eid = addEntity(world);
  addComponent(world, Player, eid);
  addComponent(world, Position, eid);
  addComponent(world, Speed, eid);
  addComponent(world, Sprite, eid);
  Position.x[eid] = Position.prevX[eid] = x;
  Position.y[eid] = Position.prevY[eid] = y;
  Speed.value[eid] = HERO_SPEED;
  Sprite.unit[eid] = UnitId.Hero;
  Sprite.dir[eid] = 4; // S, facing the camera
  return eid;
}

export function spawnSkeleton(world: IWorld, x: number, y: number, dir: number): number {
  const eid = addEntity(world);
  addComponent(world, Position, eid);
  addComponent(world, Sprite, eid);
  Position.x[eid] = Position.prevX[eid] = x;
  Position.y[eid] = Position.prevY[eid] = y;
  Sprite.unit[eid] = UnitId.Skeleton;
  Sprite.dir[eid] = dir;
  return eid;
}
