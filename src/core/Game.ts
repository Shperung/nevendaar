import { Application, Container, Point, Rectangle } from 'pixi.js';
import { FIXED_DT } from '../config';
import { Position } from '../ecs/components/Position';
import { createGameWorld, createStep, spawnHero } from '../ecs/world';
import { createRenderSystem, drawMap } from '../ecs/systems/render';
import { toScreen } from '../map/IsoMath';
import { TEST_MAP, TEST_MAP_SPAWN } from '../map/testMap';
import { createFullscreenButton } from '../ui/FullscreenButton';
import { Camera } from './Camera';
import { Input } from './Input';

export class Game {
  constructor(private readonly app: Application) {}

  start(): void {
    const { app } = this;
    const world = createGameWorld();
    const step = createStep(TEST_MAP);

    const worldLayer = new Container({ sortableChildren: true });
    app.stage.addChild(worldLayer);
    const camera = new Camera(app, worldLayer);

    app.stage.eventMode = 'static';
    app.stage.hitArea = new Rectangle(0, 0, 1e5, 1e5);
    // Last pointer position in screen pixels; re-projected every frame since the camera moves under it.
    const pointerScreen = new Point();
    app.stage.on('pointerdown', (e) => {
      if (e.button !== 0) return;
      pointerScreen.copyFrom(e.global);
      const p = worldLayer.toLocal(e.global);
      Input.click = { x: p.x, y: p.y };
      Input.held = true;
    });
    app.stage.on('globalpointermove', (e) => pointerScreen.copyFrom(e.global));
    const release = () => (Input.held = false);
    app.stage.on('pointerup', release);
    app.stage.on('pointerupoutside', release);
    window.addEventListener('blur', release);

    drawMap(worldLayer, TEST_MAP);
    const hero = spawnHero(world, TEST_MAP_SPAWN.x, TEST_MAP_SPAWN.y);
    const render = createRenderSystem(worldLayer);
    app.stage.addChild(createFullscreenButton(app));

    // Hero position in world screen pixels, interpolated the same way render.ts does.
    const heroScreen = (alpha: number) =>
      toScreen(
        Position.prevX[hero] + (Position.x[hero] - Position.prevX[hero]) * alpha,
        Position.prevY[hero] + (Position.y[hero] - Position.prevY[hero]) * alpha,
      );
    camera.centerOn(heroScreen(1));
    app.renderer.on('resize', () => camera.centerOn(heroScreen(1)));

    // Fixed-step accumulator: logic runs at exactly 60 Hz, rendering interpolates the remainder.
    let acc = 0;
    app.ticker.add((ticker) => {
      acc += Math.min(ticker.deltaMS / 1000, 0.25);
      while (acc >= FIXED_DT) {
        step(world);
        acc -= FIXED_DT;
      }
      const alpha = acc / FIXED_DT;
      render(world, alpha);
      camera.follow(heroScreen(alpha));
      const p = worldLayer.toLocal(pointerScreen);
      Input.pointer = { x: p.x, y: p.y };
    });
  }
}
