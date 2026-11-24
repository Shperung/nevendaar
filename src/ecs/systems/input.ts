import { addComponent, defineQuery, type IWorld } from 'bitecs';
import { Input } from '../../core/Input';
import { toTile } from '../../map/IsoMath';
import { MoveTarget } from '../components/MoveTarget';
import { Player } from '../components/Player';
import { Position } from '../components/Position';

const playerQuery = defineQuery([Player, Position]);

export function inputSystem(world: IWorld): void {
  const click = Input.click;
  if (!click) return;
  Input.click = null;

  const target = toTile(click.x, click.y);
  for (const eid of playerQuery(world)) {
    addComponent(world, MoveTarget, eid);
    MoveTarget.x[eid] = target.x;
    MoveTarget.y[eid] = target.y;
  }
}
