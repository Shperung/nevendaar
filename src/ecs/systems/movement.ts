import { defineQuery, removeComponent, type IWorld } from 'bitecs';
import { FIXED_DT } from '../../config';
import { MoveTarget } from '../components/MoveTarget';
import { Position } from '../components/Position';
import { Speed } from '../components/Speed';

const positionQuery = defineQuery([Position]);
const movingQuery = defineQuery([Position, MoveTarget, Speed]);

export function movementSystem(world: IWorld): void {
  for (const eid of positionQuery(world)) {
    Position.prevX[eid] = Position.x[eid];
    Position.prevY[eid] = Position.y[eid];
  }

  for (const eid of movingQuery(world)) {
    const dx = MoveTarget.x[eid] - Position.x[eid];
    const dy = MoveTarget.y[eid] - Position.y[eid];
    const dist = Math.hypot(dx, dy);
    const step = Speed.value[eid] * FIXED_DT;

    if (dist <= step) {
      Position.x[eid] = MoveTarget.x[eid];
      Position.y[eid] = MoveTarget.y[eid];
      removeComponent(world, MoveTarget, eid);
    } else {
      Position.x[eid] += (dx / dist) * step;
      Position.y[eid] += (dy / dist) * step;
    }
  }
}
