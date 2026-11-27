import { defineQuery, hasComponent, removeComponent, removeEntity, type IWorld } from 'bitecs';
import type { Point } from '../../map/Pathfinder';
import { AttackTarget } from '../components/AttackTarget';
import { Dead } from '../components/Dead';
import { Health } from '../components/Health';
import { MoveTarget } from '../components/MoveTarget';
import { Path } from '../components/Path';
import { Player } from '../components/Player';
import { Position } from '../components/Position';
import { SackItems } from '../components/SackItems';

const deadQuery = defineQuery([Dead]);

/**
 * Last step of the frame: the only place entities are removed (AGENTS.md §4).
 * A dead hero is not removed but respawns at `heroSpawn` with full health.
 */
export function createCleanupSystem(heroSpawn: Point): (world: IWorld) => void {
  return (world) => {
    for (const eid of deadQuery(world)) {
      Path.delete(eid);
      SackItems.delete(eid);
      if (!hasComponent(world, Player, eid)) {
        removeEntity(world, eid);
        continue;
      }
      removeComponent(world, Dead, eid);
      removeComponent(world, AttackTarget, eid);
      removeComponent(world, MoveTarget, eid);
      Health.current[eid] = Health.max[eid];
      Position.x[eid] = Position.prevX[eid] = heroSpawn.x;
      Position.y[eid] = Position.prevY[eid] = heroSpawn.y;
    }
  };
}
