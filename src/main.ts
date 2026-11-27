import { Application, Assets } from 'pixi.js';
import { manifest } from './assets/manifest';
import { BG_COLOR } from './config';
import { Game } from './core/Game';
import { INVENTORY_URL, parseInventory } from './gameplay/Inventory';
import { AFFIXES_URL, ITEMS_URL, parseItemData, restoreItems } from './gameplay/Items';
import { LOOT_URL, parseLoot } from './gameplay/Loot';
import { MONSTERS_URL, type MonsterDef } from './gameplay/Monster';
import { BIOMES_URL, biomeTextures, type Biome } from './map/Biome';
import { TEST_MAP_BIOME } from './map/testMap';
import { createStorage } from './save/Storage';

const app = new Application();
await app.init({ background: BG_COLOR, resizeTo: window, antialias: true });
document.body.appendChild(app.canvas);

// Hotspot (1 1) is the dagger tip in the top-left corner of the image.
app.renderer.events.cursorStyles.default = 'url(/assets/ui/cursor.png) 1 1, auto';

await Assets.init({ manifest });
await Assets.loadBundle('game');

// Only the current map's biome textures are loaded.
const biomes = await Assets.load<Record<string, Biome>>(BIOMES_URL);
const biome = biomes[TEST_MAP_BIOME];
await Assets.load(biomeTextures(biome));
const monsters = await Assets.load<Record<string, MonsterDef>>(MONSTERS_URL);
const loot = parseLoot(await Assets.load<unknown>(LOOT_URL));
const inventory = parseInventory(await Assets.load<unknown>(INVENTORY_URL));
const itemData = parseItemData(
  await Assets.load<unknown>(ITEMS_URL),
  await Assets.load<unknown>(AFFIXES_URL),
);
// Not in the manifest bundle: a missing file would fail loadBundle; render.ts falls back to Graphics.
await Assets.load({ alias: 'loot_sack', src: 'assets/atlases/loot/loot_sack.png' }).catch(() =>
  console.warn('loot_sack.png not found, the sack is drawn as a placeholder'),
);
const storage = createStorage(localStorage);
const gold = await storage.loadGold();
const items = restoreItems(await storage.loadInventory(), itemData);

new Game(app, biome, monsters, loot, inventory, itemData, storage, gold, items).start();
