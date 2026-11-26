import { Container, Graphics, Rectangle, Sprite, type Renderer } from 'pixi.js';
import { MINIMAP } from '../config';
import { Position } from '../ecs/components/Position';
import type { GameMap } from '../map/GameMap';
import { toScreen } from '../map/IsoMath';

const K = MINIMAP.tileScale;

/**
 * Minimap window (MINIMAP.w × MINIMAP.h design px) centered on the hero, in the world's iso orientation.
 * Terrain only: baked once into a texture, shifted only when the hero moves.
 */
export class Minimap extends Container {
  private readonly terrain: Sprite;
  /** Texture origin in minimap pixels (the map's left/top corner after toScreen · tileScale). */
  private readonly terrainOrigin: { x: number; y: number };
  private lastX = NaN;
  private lastY = NaN;

  constructor(renderer: Renderer, map: GameMap) {
    super();
    const { w, h } = MINIMAP;
    const p = (tx: number, ty: number) => {
      const s = toScreen(tx, ty);
      return { x: s.x * K, y: s.y * K };
    };
    const g = new Graphics()
      .poly([p(0, 0), p(map.width, 0), p(map.width, map.height), p(0, map.height)])
      .fill(0x2a2824);
    for (let ty = 0; ty < map.height; ty++) {
      for (let tx = 0; tx < map.width; tx++) {
        if (map.grid[ty][tx] !== 1) continue;
        g.poly([p(tx, ty), p(tx + 1, ty), p(tx + 1, ty + 1), p(tx, ty + 1)]);
      }
    }
    g.fill(0x6e6a60).stroke({ color: 0x8e887a, width: 0.5 });
    this.terrainOrigin = { x: p(0, map.height).x, y: 0 };
    const frame = new Rectangle(
      this.terrainOrigin.x,
      0,
      p(map.width, 0).x - this.terrainOrigin.x,
      p(map.width, map.height).y,
    );
    // Resolution 2 keeps the terrain crisp when the panel is scaled up.
    const texture = renderer.generateTexture({ target: g, frame, resolution: 2 });
    g.destroy();
    this.terrain = new Sprite(texture);

    const hero = new Graphics()
      .poly([0, -4, 6, 0, 0, 4, -6, 0])
      .fill(0xc8a96a)
      .stroke({ color: 0x000000, width: 1.5 });
    hero.position.set(w / 2, h / 2);
    const mask = new Graphics().rect(0, 0, w, h).fill(0xffffff);
    const back = new Graphics().rect(0, 0, w, h).fill(0x000000);
    this.addChild(back, this.terrain, hero, mask);
    this.mask = mask;
  }

  update(hero: number): void {
    const hx = Position.x[hero];
    const hy = Position.y[hero];
    if (hx === this.lastX && hy === this.lastY) return;
    this.lastX = hx;
    this.lastY = hy;
    const c = toScreen(hx, hy);
    this.terrain.position.set(
      MINIMAP.w / 2 - c.x * K + this.terrainOrigin.x,
      MINIMAP.h / 2 - c.y * K + this.terrainOrigin.y,
    );
  }
}
