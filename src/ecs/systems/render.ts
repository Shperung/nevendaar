import { defineQuery, enterQuery, exitQuery, hasComponent, type IWorld } from 'bitecs';
import {
  Assets,
  Container,
  FillPattern,
  Graphics,
  Sprite as PixiSprite,
  type Texture,
} from 'pixi.js';
import { CLIPS, frameAlias } from '../../assets/manifest';
import { TILE_H, UNIT_HEIGHT } from '../../config';
import { atlasPath, type Biome } from '../../map/Biome';
import { obstacleClusters, type GameMap } from '../../map/GameMap';
import { toScreen } from '../../map/IsoMath';
import { Health } from '../components/Health';
import { Position } from '../components/Position';
import { Sprite } from '../components/Sprite';

const spriteQuery = defineQuery([Position, Sprite]);
const enterSprites = enterQuery(spriteQuery);
const exitSprites = exitQuery(spriteQuery);

const HP_BAR_W = 50;
const HP_BAR_H = 6;
/** Deterministic per-tile pseudo-random value in [0, 1), so the map looks the same every run. */
function tileHash(tx: number, ty: number, salt: number): number {
  let h = Math.imul(tx * 374761393 + ty * 668265263 + salt * 2246822519, 1274126177);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Static map visuals: biome floor below everything, obstacle sprites depth-sorted with units. */
export function drawMap(layer: Container, map: GameMap, biome: Biome): void {
  const ground = Assets.get<Texture>(atlasPath(biome.ground.texture));
  const floor = new Graphics()
    .poly([
      toScreen(0, 0),
      toScreen(map.width, 0),
      toScreen(map.width, map.height),
      toScreen(0, map.height),
    ])
    .fill({ fill: new FillPattern(ground, 'repeat'), color: biome.ground.tint });
  floor.zIndex = -Infinity;
  layer.addChild(floor);

  // Each connected obstacle group gets one set (a whole rock ridge or a whole tree line).
  const sets = Object.values(biome.obstacles);
  const clusters = obstacleClusters(map);
  for (let ty = 0; ty < map.height; ty++) {
    for (let tx = 0; tx < map.width; tx++) {
      const cluster = clusters[ty * map.width + tx];
      if (cluster < 0) continue;
      const set =
        sets[
          Math.floor(
            tileHash(cluster % map.width, Math.floor(cluster / map.width), 4) * sets.length,
          )
        ];
      const variant = set[Math.floor(tileHash(tx, ty, 1) * set.length)];
      const obstacle = new PixiSprite({
        texture: Assets.get(atlasPath(variant.texture)),
        cullable: true,
      });
      obstacle.anchor.set(0.5, variant.anchorY);
      const scale = (variant.width / obstacle.texture.width) * (0.85 + tileHash(tx, ty, 2) * 0.3);
      obstacle.scale.set(tileHash(tx, ty, 3) < 0.5 ? scale : -scale, scale);
      const center = toScreen(tx + 0.5, ty + 0.5);
      const jitterX = (tileHash(tx, ty, 5) - 0.5) * TILE_H * 0.4;
      obstacle.position.set(center.x + jitterX, center.y + TILE_H * 0.3);
      // Sort by tile center depth so the hero is hidden when standing behind (north of) an obstacle.
      obstacle.zIndex = center.y;
      layer.addChild(obstacle);
    }
  }
}

export function createRenderSystem(layer: Container): (world: IWorld, alpha: number) => void {
  const views = new Map<number, { view: Container; sprite: PixiSprite; hp?: Graphics }>();

  return (world, alpha) => {
    for (const eid of enterSprites(world)) {
      // Ground shadow + sprite, anchored at the feet (0,0).
      const sprite = new PixiSprite();
      sprite.anchor.set(0.5, 1);
      const shadow = new Graphics()
        .ellipse(0, 0, UNIT_HEIGHT * 0.3, UNIT_HEIGHT * 0.15)
        .fill({ color: 0x000000, alpha: 0.35 });
      const view = new Container({ cullable: true });
      view.addChild(shadow, sprite);
      layer.addChild(view);
      let hp: Graphics | undefined;
      if (hasComponent(world, Health, eid)) {
        // Full-width red bar scaled horizontally by the health fraction, so it is drawn only once.
        const top = -UNIT_HEIGHT - HP_BAR_H - 4;
        const back = new Graphics()
          .rect(-HP_BAR_W / 2 - 1, top - 1, HP_BAR_W + 2, HP_BAR_H + 2)
          .fill(0x000000);
        hp = new Graphics().rect(0, 0, HP_BAR_W, HP_BAR_H).fill(0xc0392b);
        hp.position.set(-HP_BAR_W / 2, top);
        view.addChild(back, hp);
      }
      views.set(eid, { view, sprite, hp });
    }

    for (const eid of exitSprites(world)) {
      views.get(eid)?.view.destroy({ children: true });
      views.delete(eid);
    }

    for (const eid of spriteQuery(world)) {
      const entry = views.get(eid);
      if (!entry) continue;
      const { view, sprite, hp } = entry;
      if (hp) hp.scale.x = Math.max(0, Health.current[eid] / Health.max[eid]);
      const clip = CLIPS[Sprite.clip[eid]].name;
      sprite.texture = Assets.get(
        frameAlias(Sprite.unit[eid], clip, Sprite.dir[eid], Sprite.frame[eid]),
      );
      sprite.scale.set(UNIT_HEIGHT / sprite.texture.height);

      // Interpolate between the last two fixed steps for smooth motion at any frame rate.
      const x = Position.prevX[eid] + (Position.x[eid] - Position.prevX[eid]) * alpha;
      const y = Position.prevY[eid] + (Position.y[eid] - Position.prevY[eid]) * alpha;
      const s = toScreen(x, y);
      view.position.set(s.x, s.y);
      view.zIndex = s.y;
    }
  };
}
