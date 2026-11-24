import { defineQuery, enterQuery, exitQuery, type IWorld } from 'bitecs';
import { Container, Graphics } from 'pixi.js';
import { toScreen } from '../../map/IsoMath';
import { Position } from '../components/Position';
import { Sprite } from '../components/Sprite';

const spriteQuery = defineQuery([Position, Sprite]);
const enterSprites = enterQuery(spriteQuery);
const exitSprites = exitQuery(spriteQuery);

export function createRenderSystem(layer: Container): (world: IWorld, alpha: number) => void {
  const views = new Map<number, Graphics>();

  return (world, alpha) => {
    for (const eid of enterSprites(world)) {
      // Placeholder hero: ground shadow + body, anchored at the feet (0,0).
      const g = new Graphics()
        .ellipse(0, 0, 22, 11)
        .fill({ color: 0x000000, alpha: 0.35 })
        .rect(-16, -64, 32, 64)
        .fill(Sprite.color[eid]);
      layer.addChild(g);
      views.set(eid, g);
    }

    for (const eid of exitSprites(world)) {
      views.get(eid)?.destroy();
      views.delete(eid);
    }

    for (const eid of spriteQuery(world)) {
      const view = views.get(eid);
      if (!view) continue;
      // Interpolate between the last two fixed steps for smooth motion at any frame rate.
      const x = Position.prevX[eid] + (Position.x[eid] - Position.prevX[eid]) * alpha;
      const y = Position.prevY[eid] + (Position.y[eid] - Position.prevY[eid]) * alpha;
      const s = toScreen(x, y);
      view.position.set(s.x, s.y);
      view.zIndex = s.y;
    }
  };
}
