import { addComponent, type IWorld } from 'bitecs';
import type { Point } from '../../map/Pathfinder';
import { MoveTarget } from './MoveTarget';

/**
 * Remaining waypoints per entity. Variable-length data doesn't fit bitECS typed arrays,
 * so it lives in a side map; MoveTarget always holds the current waypoint.
 */
export const Path = new Map<number, Point[]>();

/** Starts walking along `path` (from findPath); no-op for an empty or missing path. */
export function followPath(world: IWorld, eid: number, path: Point[] | null): void {
  const first = path?.shift();
  if (!path || !first) return;
  Path.set(eid, path);
  addComponent(world, MoveTarget, eid);
  MoveTarget.x[eid] = first.x;
  MoveTarget.y[eid] = first.y;
}
