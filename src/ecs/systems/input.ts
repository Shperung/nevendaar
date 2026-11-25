import { addComponent, defineQuery, hasComponent, Not, removeComponent, type IWorld } from 'bitecs';
import { FIXED_DT, HOLD_REPATH_INTERVAL, UNIT_HEIGHT } from '../../config';
import { Input } from '../../core/Input';
import type { GameMap } from '../../map/GameMap';
import { toScreen, toTile } from '../../map/IsoMath';
import { findPath } from '../../map/Pathfinder';
import { AttackTarget } from '../components/AttackTarget';
import { Dead } from '../components/Dead';
import { Health } from '../components/Health';
import { MoveTarget } from '../components/MoveTarget';
import { followPath, Path } from '../components/Path';
import { Player } from '../components/Player';
import { Position } from '../components/Position';

const playerQuery = defineQuery([Player, Position]);
const monsterQuery = defineQuery([Position, Health, Not(Player), Not(Dead)]);
const REPATH_STEPS = Math.round(HOLD_REPATH_INTERVAL / FIXED_DT);

/** Front-most monster whose sprite box (feet at the bottom center) contains the screen point, or -1. */
function pickMonster(world: IWorld, p: { x: number; y: number }): number {
  let picked = -1;
  let pickedY = -Infinity;
  for (const eid of monsterQuery(world)) {
    const s = toScreen(Position.x[eid], Position.y[eid]);
    const inside = Math.abs(p.x - s.x) <= UNIT_HEIGHT / 4 && p.y <= s.y && p.y >= s.y - UNIT_HEIGHT;
    if (inside && s.y > pickedY) {
      picked = eid;
      pickedY = s.y;
    }
  }
  return picked;
}

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

    const monster = pickMonster(world, screenTarget);
    const target = toTile(screenTarget.x, screenTarget.y);
    for (const eid of playerQuery(world)) {
      if (monster >= 0) {
        // Approach and hitting are handled by the combat system.
        if (!hasComponent(world, AttackTarget, eid) || AttackTarget.eid[eid] !== monster) {
          addComponent(world, AttackTarget, eid);
          AttackTarget.eid[eid] = monster;
          removeComponent(world, MoveTarget, eid);
          Path.delete(eid);
        }
        continue;
      }
      removeComponent(world, AttackTarget, eid);
      followPath(world, eid, findPath(map, { x: Position.x[eid], y: Position.y[eid] }, target));
    }
  };
}
