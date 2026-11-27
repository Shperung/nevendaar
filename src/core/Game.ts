import { hasComponent } from 'bitecs';
import { Application, Assets, Container, Point, Rectangle, type Texture } from 'pixi.js';
import { ClipId, CLIPS, frameAlias, UnitId, UNITS } from '../assets/manifest';
import { DEPTH, FIXED_DT, HERO_NAME, MONSTER_PACKS, MONSTER_SPAWN_CLEARANCE } from '../config';
import { Attack } from '../ecs/components/Attack';
import { Backpack } from '../ecs/components/Backpack';
import { Dead } from '../ecs/components/Dead';
import { Health } from '../ecs/components/Health';
import { Position } from '../ecs/components/Position';
import { Speed } from '../ecs/components/Speed';
import { Wallet } from '../ecs/components/Wallet';
import { createGameWorld, createStep, spawnHero, spawnMonster } from '../ecs/world';
import { createRenderSystem, drawMap } from '../ecs/systems/render';
import type { InventoryDef } from '../gameplay/Inventory';
import type { Item, ItemData } from '../gameplay/Items';
import type { LootTable } from '../gameplay/Loot';
import type { MonsterDef } from '../gameplay/Monster';
import { mulberry32 } from '../gameplay/Random';
import type { Biome } from '../map/Biome';
import { floorPacks } from '../map/GameMap';
import { toScreen } from '../map/IsoMath';
import { TEST_MAP, TEST_MAP_SPAWN } from '../map/testMap';
import type { Storage } from '../save/Storage';
import { FindLog } from '../ui/FindLog';
import { Hud, toggleFullscreen } from '../ui/Hud';
import type { HeroStats } from '../ui/InventoryLayout';
import { InventoryWindow } from '../ui/InventoryWindow';
import { itemName, RARITY_GLOW } from '../ui/ItemText';
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
    private readonly inventory: InventoryDef,
    private readonly itemData: ItemData,
    private readonly storage: Storage,
    private readonly startGold: number,
    private readonly startItems: Item[],
  ) {}

  start(): void {
    const { app } = this;
    const world = createGameWorld();
    // New seed every run until it is kept in the save (AGENTS.md §4).
    const rng = mulberry32((Math.random() * 2 ** 32) >>> 0);
    const firstUid = this.startItems.reduce((m, i) => Math.max(m, i.uid), 0) + 1;
    const step = createStep(TEST_MAP, TEST_MAP_SPAWN, rng, this.loot, this.itemData, firstUid);

    const worldLayer = new Container({ sortableChildren: true });
    app.stage.addChild(worldLayer);
    const tooltip = new Tooltip(app.screen);
    const hud = new Hud(
      tooltip,
      Assets.get<Texture>(frameAlias(UnitId.Hero, CLIPS[ClipId.Idle].name, 4, 0)),
      () => toggleInventory(),
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
    const release = () => (Input.held = false);
    app.stage.on('pointerup', release);
    app.stage.on('pointerupoutside', release);
    window.addEventListener('blur', release);

    const updateMap = drawMap(worldLayer, TEST_MAP, this.biome);
    const hero = spawnHero(
      world,
      TEST_MAP_SPAWN.x,
      TEST_MAP_SPAWN.y,
      this.startGold,
      this.startItems,
    );
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
        this.loot.monsters[name]?.items,
      );
    }
    const inventoryWindow = new InventoryWindow(this.inventory);
    const backpack = Backpack.get(hero) ?? [];
    inventoryWindow.setItems(backpack, this.itemData);
    const heroStats = (): HeroStats => ({
      name: HERO_NAME,
      hp: Health.current[hero],
      maxHp: Health.max[hero],
      damage: Attack.damage[hero],
      cooldown: Attack.cooldown[hero],
      range: Attack.range[hero],
      speed: Speed.value[hero],
      gold: Wallet.gold[hero],
      depth: DEPTH,
    });
    const toggleInventory = () => {
      if (inventoryWindow.isOpen) inventoryWindow.close();
      else if (!hasComponent(world, Dead, hero)) inventoryWindow.open(heroStats());
    };
    // The world keeps running: the window only drops a held button so the hero stops following it.
    inventoryWindow.onChange = (open) => {
      hud.inventory.setActive(open);
      tooltip.hide();
      Input.click = null;
      Input.held = false;
    };
    // Esc closes the dialog natively; while it is open other hotkeys are ignored.
    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      if (e.code === 'KeyI') toggleInventory();
      else if (inventoryWindow.isOpen) return;
      else if (e.code === 'KeyF') toggleFullscreen();
    });

    const render = createRenderSystem(worldLayer);
    const minimap = new Minimap(app.renderer, TEST_MAP);
    hud.minimapSlot.addChild(minimap);
    const findLog = new FindLog();
    app.stage.addChild(findLog, hud, tooltip);
    hud.layout(app.screen.width, app.screen.height);
    findLog.layout(app.screen.height);
    let savedGold = this.startGold;
    let knownItems = backpack.length;

    // Hero position in world screen pixels, interpolated the same way render.ts does.
    const heroScreen = (alpha: number) =>
      toScreen(
        Position.prevX[hero] + (Position.x[hero] - Position.prevX[hero]) * alpha,
        Position.prevY[hero] + (Position.y[hero] - Position.prevY[hero]) * alpha,
      );
    camera.centerOn(heroScreen(1));
    app.renderer.on('resize', () => {
      hud.layout(app.screen.width, app.screen.height);
      findLog.layout(app.screen.height);
      camera.centerOn(heroScreen(1));
      inventoryWindow.resize();
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
      if (inventoryWindow.isOpen) inventoryWindow.update(heroStats());
      if (gold !== savedGold) {
        savedGold = gold;
        void this.storage.saveGold(gold);
      }
      // Picked up artifacts: log them, rebuild the backpack grid and save (only on change).
      if (backpack.length !== knownItems) {
        for (const item of backpack.slice(knownItems)) {
          findLog.push(`Знайдено: ${itemName(this.itemData, item)}`, RARITY_GLOW[item.rarity]);
        }
        knownItems = backpack.length;
        inventoryWindow.setItems(backpack, this.itemData);
        void this.storage.saveInventory(backpack);
      }
      findLog.update(ticker.deltaMS);
    });
  }
}
