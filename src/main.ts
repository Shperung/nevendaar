import { Application, Assets, CullerPlugin, extensions } from 'pixi.js';
import { manifest } from './assets/manifest';
import { BG_COLOR } from './config';
import { Game } from './core/Game';

// Skips rendering of `cullable` objects outside the screen (the map has thousands of blocks).
extensions.add(CullerPlugin);

const app = new Application();
await app.init({ background: BG_COLOR, resizeTo: window, antialias: true });
document.body.appendChild(app.canvas);

await Assets.init({ manifest });
await Assets.loadBundle('game');

new Game(app).start();
