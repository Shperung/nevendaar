import { addComponent, defineQuery, type IWorld } from 'bitecs';
import { Input } from '../../core/Input';
import type { GameMap } from '../../map/GameMap';
import { toTile } from '../../map/IsoMath';
import { findPath } from '../../map/Pathfinder';
import { MoveTarget } from '../components/MoveTarget';
import { Path } from '../components/Path';
import { Player } from '../components/Player';
import { Position } from '../components/Position';

const playerQuery = defineQuery([Player, Position]);

export function createInputSystem(map: GameMap): (world: IWorld) => void {
  return (world) => {
    const click = Input.click;
    if (!click) return;
    Input.click = null;

    const target = toTile(click.x, click.y);
    for (const eid of playerQuery(world)) {
      const path = findPath(map, { x: Position.x[eid], y: Position.y[eid] }, target);
      const first = path?.shift();
      if (!path || !first) continue;
      Path.set(eid, path);
      addComponent(world, MoveTarget, eid);
      MoveTarget.x[eid] = first.x;
      MoveTarget.y[eid] = first.y;
    }
  };
}
