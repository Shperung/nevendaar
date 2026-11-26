import { Application, Assets, Container, Point, Rectangle, type Texture } from 'pixi.js';
import { ClipId, CLIPS, frameAlias, UnitId, UNITS } from '../assets/manifest';
import { FIXED_DT, MONSTER_PACKS, MONSTER_SPAWN_CLEARANCE } from '../config';
import { Health } from '../ecs/components/Health';
import { Position } from '../ecs/components/Position';
import { Wallet } from '../ecs/components/Wallet';
import { createGameWorld, createStep, spawnHero, spawnMonster } from '../ecs/world';
import { createRenderSystem, drawMap } from '../ecs/systems/render';
import type { LootTable } from '../gameplay/Loot';
import type { MonsterDef } from '../gameplay/Monster';
import { mulberry32 } from '../gameplay/Random';
import type { Biome } from '../map/Biome';
import { floorPacks } from '../map/GameMap';
import { toScreen } from '../map/IsoMath';
import { TEST_MAP, TEST_MAP_SPAWN } from '../map/testMap';
import type { Storage } from '../save/Storage';
import { Hud, toggleFullscreen } from '../ui/Hud';
import { Minimap } from '../ui/Minimap';
import { Tooltip } from '../ui/Tooltip';
import { Camera } from './Camera';
import { Input } from './Input';

export class Game {
  constructor(
    private readonly app: Application,
    private readonly biome: Biome,
    private readonly monsterDefs: Record<string, MonsterDef>,
    private readonly loot: LootTable,
    private readonly storage: Storage,
    private readonly startGold: number,
  ) {}

  start(): void {
    const { app } = this;
    const world = createGameWorld();
    // New seed every run until it is kept in the save (AGENTS.md §4).
    const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
    const step = createStep(TEST_MAP, TEST_MAP_SPAWN, rng, this.loot.pickup);

    const worldLayer = new Container({ sortableChildren: true });
    app.stage.addChild(worldLayer);
    const tooltip = new Tooltip(app.screen);
    const hud = new Hud(
      tooltip,
      Assets.get<Texture>(frameAlias(UnitId.Hero, CLIPS[ClipId.Idle].name, 4, 0)),
    );
    // The game area is the screen left of the side panel.
    const viewport = () => ({
      width: app.screen.width - hud.panelWidth,
      height: app.screen.height,
    });
    const camera = new Camera(viewport, worldLayer);

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
    // Over the panel the game keeps the last pointer position in the game area (a held move goes there).
    app.stage.on('globalpointermove', (e) => {
      Input.overPanel = e.global.x >= hud.x;
      if (!Input.overPanel) pointerScreen.copyFrom(e.global);
    });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyF' && !e.repeat) toggleFullscreen();
    });
    const release = () => (Input.held = false);
    app.stage.on('pointerup', release);
    app.stage.on('pointerupoutside', release);
    window.addEventListener('blur', release);

    const updateMap = drawMap(worldLayer, TEST_MAP, this.biome);
    const hero = spawnHero(world, TEST_MAP_SPAWN.x, TEST_MAP_SPAWN.y, this.startGold);
    const packs = floorPacks(
      TEST_MAP,
      { ...MONSTER_PACKS, avoid: TEST_MAP_SPAWN, minDist: MONSTER_SPAWN_CLEARANCE },
      rng,
    );
    const monsters = [UnitId.Skeleton, UnitId.NecroWarrior, UnitId.Zombie];
    // Each monster rolls its own type, so packs come out mixed (or uniform by chance).
    for (const { x, y } of packs.flat()) {
      const unit = monsters[Math.floor(rng() * monsters.length)];
      const name = UNITS[unit];
      spawnMonster(
        world,
        unit,
        x,
        y,
        Math.floor(rng() * 8),
        this.monsterDefs[name],
        this.loot.monsters[name]?.gold,
      );
    }
    const render = createRenderSystem(worldLayer);
    const minimap = new Minimap(app.renderer, TEST_MAP);
    hud.minimapSlot.addChild(minimap);
    app.stage.addChild(hud, tooltip);
    hud.layout(app.screen.width, app.screen.height);
    let savedGold = this.startGold;

    // Hero position in world screen pixels, interpolated the same way render.ts does.
    const heroScreen = (alpha: number) =>
      toScreen(
        Position.prevX[hero] + (Position.x[hero] - Position.prevX[hero]) * alpha,
        Position.prevY[hero] + (Position.y[hero] - Position.prevY[hero]) * alpha,
      );
    camera.centerOn(heroScreen(1));
    app.renderer.on('resize', () => {
      hud.layout(app.screen.width, app.screen.height);
      camera.centerOn(heroScreen(1));
    });

    // Fixed-step accumulator: logic runs at exactly 60 Hz, rendering interpolates the remainder.
    let acc = 0;
    app.ticker.add((ticker) => {
      acc += Math.min(ticker.deltaMS / 1000, 0.25);
      while (acc >= FIXED_DT) {
        step(world);
        acc -= FIXED_DT;
      }
      const alpha = acc / FIXED_DT;
      camera.follow(heroScreen(alpha));
      const cam = { x: -worldLayer.x, y: -worldLayer.y, ...viewport() };
      updateMap(cam);
      render(world, alpha, cam);
      const p = worldLayer.toLocal(pointerScreen);
      Input.pointer = { x: p.x, y: p.y };

      const gold = Wallet.gold[hero];
      hud.update({ gold, hp: Health.current[hero], maxHp: Health.max[hero] });
      minimap.update(hero);
      if (gold !== savedGold) {
        savedGold = gold;
        void this.storage.saveGold(gold);
      }
    });
  }
}
