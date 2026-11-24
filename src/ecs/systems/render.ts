import { defineQuery, enterQuery, exitQuery, type IWorld } from 'bitecs';
import { Assets, Container, Graphics, Sprite as PixiSprite } from 'pixi.js';
import { frameAlias } from '../../assets/manifest';
import { isWalkable, type GameMap } from '../../map/GameMap';
import { toScreen } from '../../map/IsoMath';
import { Position } from '../components/Position';
import { Sprite } from '../components/Sprite';

const spriteQuery = defineQuery([Position, Sprite]);
const enterSprites = enterQuery(spriteQuery);
const exitSprites = exitQuery(spriteQuery);

const BLOCK_HEIGHT = 40;
/** On-screen height of unit sprites in pixels. */
const SPRITE_HEIGHT = 110;

/** Static map visuals: floor outline below everything, obstacles as iso blocks depth-sorted with sprites. */
export function drawMap(layer: Container, map: GameMap): void {
  const corners = (tx: number, ty: number, w: number, h: number) => [
    toScreen(tx, ty),
    toScreen(tx + w, ty),
    toScreen(tx + w, ty + h),
    toScreen(tx, ty + h),
  ];

  const floor = new Graphics()
    .poly(corners(0, 0, map.width, map.height))
    .fill(0x4a4a4a)
    .stroke({ color: 0x6a6a6a, width: 2 });
  floor.zIndex = -Infinity;
  layer.addChild(floor);

  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      if (isWalkable(map, tx, ty)) continue;
      const [top, right, bottom, left] = corners(tx, ty, 1, 1);
      const up = (p: { x: number; y: number }) => ({ x: p.x, y: p.y - BLOCK_HEIGHT });
      const block = new Graphics()
        .poly([left, bottom, up(bottom), up(left)])
        .fill(0x2e2e34)
        .poly([bottom, right, up(right), up(bottom)])
        .fill(0x3a3a42)
        .poly([up(top), up(right), up(bottom), up(left)])
        .fill(0x6b6b78);
      // Sort by tile center depth so the hero is hidden when standing behind (north of) a block.
      block.zIndex = toScreen(tx + 0.5, ty + 0.5).y;
      layer.addChild(block);
    }
  }
}

export function createRenderSystem(layer: Container): (world: IWorld, alpha: number) => void {
  const views = new Map<number, { view: Container; sprite: PixiSprite }>();

  return (world, alpha) => {
    for (const eid of enterSprites(world)) {
      // Ground shadow + sprite, anchored at the feet (0,0).
      const sprite = new PixiSprite();
      sprite.anchor.set(0.5, 1);
      const shadow = new Graphics()
        .ellipse(0, 0, SPRITE_HEIGHT * 0.3, SPRITE_HEIGHT * 0.15)
        .fill({ color: 0x000000, alpha: 0.35 });
      const view = new Container();
      view.addChild(shadow, sprite);
      layer.addChild(view);
      views.set(eid, { view, sprite });
    }

    for (const eid of exitSprites(world)) {
      views.get(eid)?.view.destroy({ children: true });
      views.delete(eid);
    }

    for (const eid of spriteQuery(world)) {
      const entry = views.get(eid);
      if (!entry) continue;
      const { view, sprite } = entry;
      sprite.texture = Assets.get(frameAlias(Sprite.unit[eid], 'idle', Sprite.dir[eid], 0));
      sprite.scale.set(SPRITE_HEIGHT / sprite.texture.height);

      // Interpolate between the last two fixed steps for smooth motion at any frame rate.
      const x = Position.prevX[eid] + (Position.x[eid] - Position.prevX[eid]) * alpha;
      const y = Position.prevY[eid] + (Position.y[eid] - Position.prevY[eid]) * alpha;
      const s = toScreen(x, y);
      view.position.set(s.x, s.y);
      view.zIndex = s.y;
    }
  };
}
