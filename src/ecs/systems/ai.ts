import { addComponent, defineQuery, hasComponent, Not, removeComponent, type IWorld } from 'bitecs';
import { AI } from '../components/AI';
import { AttackTarget } from '../components/AttackTarget';
import { Dead } from '../components/Dead';
import { MoveTarget } from '../components/MoveTarget';
import { Path } from '../components/Path';
import { Player } from '../components/Player';
import { Position } from '../components/Position';

const heroQuery = defineQuery([Player, Position, Not(Dead)]);
const aiQuery = defineQuery([AI, Position, Not(Dead)]);

/** Idle monsters start chasing a hero that comes within aggro range; chasing and hitting is combat's job. */
export function aiSystem(world: IWorld): void {
  const hero = heroQuery(world)[0];
  for (const eid of aiQuery(world)) {
    const chasing = hasComponent(world, AttackTarget, eid);
    const dist =
      hero === undefined
        ? Infinity
        : Math.hypot(Position.x[hero] - Position.x[eid], Position.y[hero] - Position.y[eid]);

    if (!chasing && dist <= AI.aggro[eid]) {
      addComponent(world, AttackTarget, eid);
      AttackTarget.eid[eid] = hero;
      AttackTarget.repeat[eid] = 1;
    } else if (chasing && dist > AI.leash[eid]) {
      removeComponent(world, AttackTarget, eid);
      removeComponent(world, MoveTarget, eid);
      Path.delete(eid);
    }
  }
}
