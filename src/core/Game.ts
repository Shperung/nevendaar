import { Application, Container, Rectangle } from 'pixi.js';
import { FIXED_DT } from '../config';
import { createGameWorld, createStep, spawnHero } from '../ecs/world';
import { createRenderSystem, drawMap } from '../ecs/systems/render';
import { toScreen } from '../map/IsoMath';
import { TEST_MAP, TEST_MAP_SPAWN } from '../map/testMap';
import { Input } from './Input';

export class Game {
  constructor(private readonly app: Application) {}

  start(): void {
    const { app } = this;
    const world = createGameWorld();
    const step = createStep(TEST_MAP);

    // Static camera: the spawn point sits at the screen center.
    const worldLayer = new Container({ sortableChildren: true });
    app.stage.addChild(worldLayer);
    const spawnScreen = toScreen(TEST_MAP_SPAWN.x, TEST_MAP_SPAWN.y);
    const center = () =>
      worldLayer.position.set(
        app.screen.width / 2 - spawnScreen.x,
        app.screen.height / 2 - spawnScreen.y,
      );
    center();
    app.renderer.on('resize', center);

    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, 1e5, 1e5);
    app.stage.on('pointerdown', (e) => {
      if (e.button !== 0) return;
      const p = worldLayer.toLocal(e.global);
      Input.click = { x: p.x, y: p.y };
      Input.pointer = { x: p.x, y: p.y };
      Input.held = true;
    });
    app.stage.on('globalpointermove', (e) => {
      const p = worldLayer.toLocal(e.global);
      Input.pointer = { x: p.x, y: p.y };
    });
    const release = () => (Input.held = false);
    app.stage.on('pointerup', release);
    app.stage.on('pointerupoutside', release);
    window.addEventListener('blur', release);

    drawMap(worldLayer, TEST_MAP);
    spawnHero(world, TEST_MAP_SPAWN.x, TEST_MAP_SPAWN.y);
    const render = createRenderSystem(worldLayer);

    // Fixed-step accumulator: logic runs at exactly 60 Hz, rendering interpolates the remainder.
    let acc = 0;
    app.ticker.add((ticker) => {
      acc += Math.min(ticker.deltaMS / 1000, 0.25);
      while (acc >= FIXED_DT) {
        step(world);
        acc -= FIXED_DT;
      }
      render(world, acc / FIXED_DT);
    });
  }
}
