import type { Point } from '../../map/Pathfinder';

/**
 * Remaining waypoints per entity. Variable-length data doesn't fit bitECS typed arrays,
 * so it lives in a side map; MoveTarget always holds the current waypoint.
 */
export const Path = new Map<number, Point[]>();
