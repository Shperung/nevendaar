import { Application, Container, Rectangle } from 'pixi.js';
import { FIXED_DT } from '../config';
import { createGameWorld, spawnHero, stepWorld } from '../ecs/world';
import { createRenderSystem } from '../ecs/systems/render';
import { Input } from './Input';

export class Game {
  constructor(private readonly app: Application) {}

  start(): void {
    const { app } = this;
    const world = createGameWorld();

    // World origin (tile 0,0) sits at the screen center; the hero spawns there.
    const worldLayer = new Container({ sortableChildren: true });
    app.stage.addChild(worldLayer);
    const center = () => worldLayer.position.set(app.screen.width / 2, app.screen.height / 2);
    center();
    app.renderer.on('resize', center);

    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, 1e5, 1e5);
    app.stage.on('pointerdown', (e) => {
      const p = worldLayer.toLocal(e.global);
      Input.click = { x: p.x, y: p.y };
    });

    spawnHero(world, 0, 0);
    const render = createRenderSystem(worldLayer);

    // Fixed-step accumulator: logic runs at exactly 60 Hz, rendering interpolates the remainder.
    let acc = 0;
    app.ticker.add((ticker) => {
      acc += Math.min(ticker.deltaMS / 1000, 0.25);
      while (acc >= FIXED_DT) {
        stepWorld(world);
        acc -= FIXED_DT;
      }
      render(world, acc / FIXED_DT);
    });
  }
}
