import { addComponent, addEntity, createWorld, type IWorld } from 'bitecs';
import { HERO_SPEED } from '../config';
import type { GameMap } from '../map/GameMap';
import { Player } from './components/Player';
import { Position } from './components/Position';
import { Speed } from './components/Speed';
import { Sprite } from './components/Sprite';
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
  Sprite.color[eid] = 0xb03030;
  return eid;
}
