import { addComponent, defineQuery, type IWorld } from 'bitecs';
import { FIXED_DT, HOLD_REPATH_INTERVAL } from '../../config';
import { Input } from '../../core/Input';
import type { GameMap } from '../../map/GameMap';
import { toTile } from '../../map/IsoMath';
import { findPath } from '../../map/Pathfinder';
import { MoveTarget } from '../components/MoveTarget';
import { Path } from '../components/Path';
import { Player } from '../components/Player';
import { Position } from '../components/Position';

const playerQuery = defineQuery([Player, Position]);
const REPATH_STEPS = Math.round(HOLD_REPATH_INTERVAL / FIXED_DT);

export function createInputSystem(map: GameMap): (world: IWorld) => void {
  let cooldown = 0;

  return (world) => {
    let screenTarget: { x: number; y: number } | null = null;
    cooldown--;
    if (Input.click) {
      screenTarget = Input.click;
      Input.click = null;
      cooldown = REPATH_STEPS;
    } else if (Input.held && cooldown <= 0) {
      screenTarget = Input.pointer;
      cooldown = REPATH_STEPS;
    }
    if (!screenTarget) return;

    const target = toTile(screenTarget.x, screenTarget.y);
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
