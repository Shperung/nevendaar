import { defineQuery, type IWorld } from 'bitecs';
import { ClipId, CLIPS } from '../../assets/manifest';
import { FIXED_DT } from '../../config';
import { directionFromDelta } from '../../map/IsoMath';
import { Position } from '../components/Position';
import { Sprite } from '../components/Sprite';

const spriteQuery = defineQuery([Position, Sprite]);

/** Picks idle/walk by movement, faces the movement direction and advances the clip frame. */
export function animationSystem(world: IWorld): void {
  for (const eid of spriteQuery(world)) {
    const dx = Position.x[eid] - Position.prevX[eid];
    const dy = Position.y[eid] - Position.prevY[eid];
    const moving = dx !== 0 || dy !== 0;
    if (moving) Sprite.dir[eid] = directionFromDelta(dx, dy);

    const clip = moving ? ClipId.Walk : ClipId.Idle;
    const { frames, fps } = CLIPS[clip];
    if (clip !== Sprite.clip[eid]) {
      Sprite.clip[eid] = clip;
      Sprite.time[eid] = 0;
    } else {
      Sprite.time[eid] = (Sprite.time[eid] + FIXED_DT) % (frames / fps);
    }
    Sprite.frame[eid] = Math.floor(Sprite.time[eid] * fps) % frames;
  }
}
