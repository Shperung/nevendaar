import { defineQuery, enterQuery, exitQuery, hasComponent, type IWorld } from 'bitecs';
import {
  Assets,
  Container,
  FillPattern,
  Graphics,
  Sprite as PixiSprite,
  Text,
  type Texture,
} from 'pixi.js';
import { CLIPS, frameAlias } from '../../assets/manifest';
import { GOLD_PILE_PICK, TILE_H, UNIT_HEIGHT } from '../../config';
import { Input } from '../../core/Input';
import { pileTier } from '../../gameplay/Loot';
import { atlasPath, type Biome } from '../../map/Biome';
import { obstacleClusters, type GameMap } from '../../map/GameMap';
import { toScreen, toTile } from '../../map/IsoMath';
import { GoldPile } from '../components/GoldPile';
import { Health } from '../components/Health';
import { Player } from '../components/Player';
import { Position } from '../components/Position';
import { Sprite } from '../components/Sprite';

const spriteQuery = defineQuery([Position, Sprite]);
const enterSprites = enterQuery(spriteQuery);
const exitSprites = exitQuery(spriteQuery);
const pileQuery = defineQuery([Position, GoldPile]);
const enterPiles = enterQuery(pileQuery);
const exitPiles = exitQuery(pileQuery);
/** Gold pouch sprite width per pileTier, in pixels. */
const PILE_SIZES = [32, 44, 58];

const HP_BAR_W = 50;
const HP_BAR_H = 6;
/** Deterministic per-tile pseudo-random value in [0, 1), so the map looks the same every run. */
function tileHash(tx: number, ty: number, salt: number): number {
  let h = Math.imul(tx * 374761393 + ty * 668265263 + salt * 2246822519, 1274126177);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}

/** Visible part of the world layer, in layer-local (world screen) pixels. */
export type ViewRect = { x: number; y: number; width: number; height: number };

/** Obstacle chunk size in tiles: the unit of adding/removing map sprites to the layer. */
const CHUNK = 16;
/** Extra pixels around the view, so tall sprites at the edge never pop in visibly. */
const VIEW_MARGIN = 256;

function inView(v: ViewRect, x: number, y: number): boolean {
  return (
    x > v.x - VIEW_MARGIN &&
    x < v.x + v.width + VIEW_MARGIN &&
    y > v.y - VIEW_MARGIN &&
    y < v.y + v.height + VIEW_MARGIN
  );
}

/**
 * Static map visuals: biome floor below everything, obstacle sprites depth-sorted with units.
 * Returns an updater that keeps only obstacle chunks under the view in the layer
 * (the map has ~17k obstacles; sorting and rendering all of them every frame is what lagged).
 */
export function drawMap(layer: Container, map: GameMap, biome: Biome): (view: ViewRect) => void {
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
  const cols = Math.ceil(map.width / CHUNK);
  const rows = Math.ceil(map.height / CHUNK);
  const chunks: PixiSprite[][] = Array.from({ length: cols * rows }, () => []);
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
      const obstacle = new PixiSprite({ texture: Assets.get(atlasPath(variant.texture)) });
      obstacle.anchor.set(0.5, variant.anchorY);
      const scale = (variant.width / obstacle.texture.width) * (0.85 + tileHash(tx, ty, 2) * 0.3);
      obstacle.scale.set(tileHash(tx, ty, 3) < 0.5 ? scale : -scale, scale);
      const center = toScreen(tx + 0.5, ty + 0.5);
      const jitterX = (tileHash(tx, ty, 5) - 0.5) * TILE_H * 0.4;
      obstacle.position.set(center.x + jitterX, center.y + TILE_H * 0.3);
      // Sort by tile center depth so the hero is hidden when standing behind (north of) an obstacle.
      obstacle.zIndex = center.y;
      chunks[Math.floor(ty / CHUNK) * cols + Math.floor(tx / CHUNK)].push(obstacle);
    }
  }

  let shown = new Set<number>();
  return (view) => {
    const x0 = view.x - VIEW_MARGIN;
    const x1 = view.x + view.width + VIEW_MARGIN;
    const y0 = view.y - VIEW_MARGIN;
    const y1 = view.y + view.height + VIEW_MARGIN;
    // Tile x = (a + b) / 2 and tile y = (b - a) / 2 (see toTile), so on an axis-aligned screen rect
    // tile x is smallest at the top-left corner and largest at the bottom-right,
    // tile y is smallest at the top-right corner and largest at the bottom-left.
    const cx0 = Math.max(0, Math.floor(toTile(x0, y0).x / CHUNK));
    const cx1 = Math.min(cols - 1, Math.floor(toTile(x1, y1).x / CHUNK));
    const cy0 = Math.max(0, Math.floor(toTile(x1, y0).y / CHUNK));
    const cy1 = Math.min(rows - 1, Math.floor(toTile(x0, y1).y / CHUNK));
    const next = new Set<number>();
    for (let cy = cy0; cy <= cy1; cy++) {
      for (let cx = cx0; cx <= cx1; cx++) {
        const k = cy * cols + cx;
        if (chunks[k].length > 0) next.add(k);
      }
    }
    for (const k of next) if (!shown.has(k)) layer.addChild(...chunks[k]);
    for (const k of shown) if (!next.has(k)) layer.removeChild(...chunks[k]);
    shown = next;
  };
}

export function createRenderSystem(
  layer: Container,
): (world: IWorld, alpha: number, cam: ViewRect) => void {
  const views = new Map<number, { view: Container; sprite: PixiSprite; hp?: Graphics }>();
  const pileViews = new Map<number, Container>();
  // One shared hover label instead of a Text per pile (there can be ~1500 piles).
  const pileLabel = new Text({
    style: { fontSize: 14, fill: 0xf1c40f, stroke: { color: 0x000000, width: 3 } },
    anchor: { x: 0.5, y: 1 },
    visible: false,
    zIndex: Infinity,
  });
  layer.addChild(pileLabel);

  return (world, alpha, cam) => {
    for (const eid of enterPiles(world)) {
      const w = PILE_SIZES[pileTier(GoldPile.amount[eid])];
      const shadow = new Graphics()
        .ellipse(0, 0, w * 0.45, w * 0.2)
        .fill({ color: 0x000000, alpha: 0.35 });
      const pile = new PixiSprite({
        texture: Assets.get('gold_pouch'),
        anchor: { x: 0.5, y: 0.85 },
      });
      pile.scale.set(w / pile.texture.width);
      const view = new Container();
      view.addChild(shadow, pile);
      const s = toScreen(Position.x[eid], Position.y[eid]);
      view.position.set(s.x, s.y);
      // Below the feet of a unit standing on the pile.
      view.zIndex = s.y - TILE_H / 2;
      layer.addChild(view);
      pileViews.set(eid, view);
    }

    for (const eid of exitPiles(world)) {
      pileViews.get(eid)?.destroy({ children: true });
      pileViews.delete(eid);
    }

    let hovered = -1;
    let hoveredY = -Infinity;
    for (const eid of pileQuery(world)) {
      const view = pileViews.get(eid);
      if (!view) continue;
      view.visible = inView(cam, view.x, view.y);
      if (!view.visible) continue;
      view.alpha = GoldPile.delay[eid] > 0 ? 0.5 : 1;
      const dx = Input.pointer.x - view.x;
      const dy = Input.pointer.y - view.y;
      if (Math.hypot(dx, dy * 2) <= GOLD_PILE_PICK && view.y > hoveredY) {
        hovered = eid;
        hoveredY = view.y;
      }
    }
    if (Input.overPanel) hovered = -1;
    pileLabel.visible = hovered >= 0;
    if (hovered >= 0) {
      const view = pileViews.get(hovered) as Container;
      pileLabel.text = `${GoldPile.amount[hovered]} золота`;
      pileLabel.position.set(view.x, view.y - view.height);
    }

    for (const eid of enterSprites(world)) {
      // Ground shadow + sprite, anchored at the feet (0,0).
      const sprite = new PixiSprite();
      sprite.anchor.set(0.5, 1);
      const shadow = new Graphics()
        .ellipse(0, 0, UNIT_HEIGHT * 0.3, UNIT_HEIGHT * 0.15)
        .fill({ color: 0x000000, alpha: 0.35 });
      const view = new Container();
      view.addChild(shadow, sprite);
      layer.addChild(view);
      let hp: Graphics | undefined;
      if (hasComponent(world, Health, eid)) {
        // Full-width bar scaled horizontally by the health fraction, so it is drawn only once.
        const top = -UNIT_HEIGHT - HP_BAR_H - 4;
        const back = new Graphics()
          .rect(-HP_BAR_W / 2 - 1, top - 1, HP_BAR_W + 2, HP_BAR_H + 2)
          .fill(0x000000);
        const color = hasComponent(world, Player, eid) ? 0x27ae60 : 0xc0392b;
        hp = new Graphics().rect(0, 0, HP_BAR_W, HP_BAR_H).fill(color);
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
      // Interpolate between the last two fixed steps for smooth motion at any frame rate.
      const x = Position.prevX[eid] + (Position.x[eid] - Position.prevX[eid]) * alpha;
      const y = Position.prevY[eid] + (Position.y[eid] - Position.prevY[eid]) * alpha;
      const s = toScreen(x, y);
      // Off-screen units are hidden and not updated at all (there are thousands of them).
      view.visible = inView(cam, s.x, s.y);
      if (!view.visible) continue;
      view.position.set(s.x, s.y);
      view.zIndex = s.y;

      if (hp) hp.scale.x = Math.max(0, Health.current[eid] / Health.max[eid]);
      const clip = CLIPS[Sprite.clip[eid]].name;
      sprite.texture = Assets.get(
        frameAlias(Sprite.unit[eid], clip, Sprite.dir[eid], Sprite.frame[eid]),
      );
      sprite.scale.set(UNIT_HEIGHT / sprite.texture.height);
    }
  };
}
