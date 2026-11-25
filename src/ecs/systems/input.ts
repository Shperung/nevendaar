import { addComponent, defineQuery, hasComponent, Not, removeComponent, type IWorld } from 'bitecs';
import { FIXED_DT, GOLD_PILE_PICK, HOLD_REPATH_INTERVAL, UNIT_HEIGHT } from '../../config';
import { Input } from '../../core/Input';
import type { GameMap } from '../../map/GameMap';
import { toScreen, toTile } from '../../map/IsoMath';
import { findPath } from '../../map/Pathfinder';
import { AttackTarget } from '../components/AttackTarget';
import { Dead } from '../components/Dead';
import { GoldPile } from '../components/GoldPile';
import { Health } from '../components/Health';
import { MoveTarget } from '../components/MoveTarget';
import { followPath, Path } from '../components/Path';
import { Player } from '../components/Player';
import { Position } from '../components/Position';

const playerQuery = defineQuery([Player, Position]);
const attackingQuery = defineQuery([Player, AttackTarget]);
const monsterQuery = defineQuery([Position, Health, Not(Player), Not(Dead)]);
const pileQuery = defineQuery([Position, GoldPile, Not(Dead)]);
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

/** Front-most gold pile within the iso-squashed hit radius of the screen point, or -1. */
function pickPile(world: IWorld, p: { x: number; y: number }): number {
  let picked = -1;
  let pickedY = -Infinity;
  for (const eid of pileQuery(world)) {
    const s = toScreen(Position.x[eid], Position.y[eid]);
    if (Math.hypot(p.x - s.x, (p.y - s.y) * 2) <= GOLD_PILE_PICK && s.y > pickedY) {
      picked = eid;
      pickedY = s.y;
    }
  }
  return picked;
}

export function createInputSystem(map: GameMap): (world: IWorld) => void {
  let cooldown = 0;

  return (world) => {
    for (const eid of attackingQuery(world)) AttackTarget.repeat[eid] = Input.held ? 1 : 0;

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
    // Click priority: monster > gold pile > ground.
    const pile = monster < 0 ? pickPile(world, screenTarget) : -1;
    const target =
      pile >= 0
        ? { x: Position.x[pile], y: Position.y[pile] }
        : toTile(screenTarget.x, screenTarget.y);
    for (const eid of playerQuery(world)) {
      if (monster >= 0) {
        // Approach and hitting are handled by the combat system.
        if (!hasComponent(world, AttackTarget, eid) || AttackTarget.eid[eid] !== monster) {
          addComponent(world, AttackTarget, eid);
          AttackTarget.eid[eid] = monster;
          AttackTarget.repeat[eid] = Input.held ? 1 : 0;
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
