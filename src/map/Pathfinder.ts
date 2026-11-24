import EasyStar from 'easystarjs';
import { isWalkable, type GameMap } from './GameMap';

export type Point = { x: number; y: number };

/**
 * Returns waypoints (tile space) from `from` to `to` around obstacles, or null if unreachable.
 * Intermediate waypoints are tile centers; the last one is the exact target point.
 */
export function findPath(map: GameMap, from: Point, to: Point): Point[] | null {
  if (!isWalkable(map, to.x, to.y)) return null;

  const easystar = new EasyStar.js();
  easystar.setGrid(map.grid);
  easystar.setAcceptableTiles([0]);
  easystar.enableDiagonals();
  // No diagonal squeezing past obstacle corners, so straight segments never clip a block.
  easystar.disableCornerCutting();
  easystar.enableSync();

  let tiles: Point[] | null = null;
  easystar.findPath(
    Math.floor(from.x),
    Math.floor(from.y),
    Math.floor(to.x),
    Math.floor(to.y),
    (path) => (tiles = path),
  );
  easystar.calculate();

  const found = tiles as Point[] | null;
  if (!found) return null;
  // Drop the start tile (we're already in it) and the goal tile (replaced by the exact point).
  const waypoints = found.slice(1, -1).map((t) => ({ x: t.x + 0.5, y: t.y + 0.5 }));
  waypoints.push({ x: to.x, y: to.y });
  return waypoints;
}
