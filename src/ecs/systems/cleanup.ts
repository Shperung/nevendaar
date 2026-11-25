import { defineQuery, removeEntity, type IWorld } from 'bitecs';
import { Dead } from '../components/Dead';
import { Path } from '../components/Path';

const deadQuery = defineQuery([Dead]);

/** Last step of the frame: the only place entities are removed (AGENTS.md §4). */
export function cleanupSystem(world: IWorld): void {
  for (const eid of deadQuery(world)) {
    Path.delete(eid);
    removeEntity(world, eid);
  }
}
