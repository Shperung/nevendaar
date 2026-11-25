import { addComponent, defineQuery, hasComponent, removeComponent, type IWorld } from 'bitecs';
import { ClipId, hasClip } from '../../assets/manifest';
import { FIXED_DT } from '../../config';
import type { GameMap } from '../../map/GameMap';
import { directionFromDelta } from '../../map/IsoMath';
import { findPath } from '../../map/Pathfinder';
import { Attack } from '../components/Attack';
import { AttackTarget } from '../components/AttackTarget';
import { Dead } from '../components/Dead';
import { Health } from '../components/Health';
import { MoveTarget } from '../components/MoveTarget';
import { followPath, Path } from '../components/Path';
import { Position } from '../components/Position';
import { Sprite } from '../components/Sprite';

const attackerQuery = defineQuery([Attack]);
const chasingQuery = defineQuery([Position, Attack, AttackTarget]);

/** Walks attackers up to their target, then hits it every `cooldown` seconds until it dies. */
export function createCombatSystem(map: GameMap): (world: IWorld) => void {
  return (world) => {
    for (const eid of attackerQuery(world)) {
      Attack.timer[eid] = Math.max(0, Attack.timer[eid] - FIXED_DT);
    }

    for (const eid of chasingQuery(world)) {
      const t = AttackTarget.eid[eid];
      if (!hasComponent(world, Health, t) || hasComponent(world, Dead, t)) {
        removeComponent(world, AttackTarget, eid);
        continue;
      }

      const dx = Position.x[t] - Position.x[eid];
      const dy = Position.y[t] - Position.y[eid];
      if (Math.hypot(dx, dy) > Attack.range[eid]) {
        if (!hasComponent(world, MoveTarget, eid)) {
          const to = { x: Position.x[t], y: Position.y[t] };
          followPath(world, eid, findPath(map, { x: Position.x[eid], y: Position.y[eid] }, to));
        }
        continue;
      }

      removeComponent(world, MoveTarget, eid);
      Path.delete(eid);
      Sprite.dir[eid] = directionFromDelta(dx, dy);
      if (Attack.timer[eid] > 0) continue;

      Attack.timer[eid] = Attack.cooldown[eid];
      if (hasClip(Sprite.unit[eid], ClipId.Attack)) {
        Sprite.clip[eid] = ClipId.Attack;
        Sprite.time[eid] = -FIXED_DT;
      }
      Health.current[t] -= Attack.damage[eid];
      if (Health.current[t] <= 0) addComponent(world, Dead, t);
      if (Health.current[t] <= 0 || !AttackTarget.repeat[eid]) {
        removeComponent(world, AttackTarget, eid);
      }
    }
  };
}
