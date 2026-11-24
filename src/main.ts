import { Application, Assets, CullerPlugin, extensions } from 'pixi.js';
import { manifest } from './assets/manifest';
import { BG_COLOR } from './config';
import { Game } from './core/Game';
import { BIOMES_URL, biomeTextures, type Biome } from './map/Biome';
import { TEST_MAP_BIOME } from './map/testMap';

// Skips rendering of `cullable` objects outside the screen (the map has thousands of blocks).
extensions.add(CullerPlugin);

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

new Game(app, biome).start();
