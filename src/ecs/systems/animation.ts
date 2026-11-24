import { defineQuery, type IWorld } from 'bitecs';
import { directionFromDelta } from '../../map/IsoMath';
import { Position } from '../components/Position';
import { Sprite } from '../components/Sprite';

const spriteQuery = defineQuery([Position, Sprite]);

/** Turns sprites to face their movement direction; idle entities keep their last facing. */
export function animationSystem(world: IWorld): void {
  for (const eid of spriteQuery(world)) {
    const dx = Position.x[eid] - Position.prevX[eid];
    const dy = Position.y[eid] - Position.prevY[eid];
    if (dx !== 0 || dy !== 0) Sprite.dir[eid] = directionFromDelta(dx, dy);
  }
}
