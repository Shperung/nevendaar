import { Application, Assets } from 'pixi.js';
import { manifest } from './assets/manifest';
import { BG_COLOR } from './config';
import { Game } from './core/Game';

const app = new Application();
await app.init({ background: BG_COLOR, resizeTo: window, antialias: true });
document.body.appendChild(app.canvas);

await Assets.init({ manifest });
await Assets.loadBundle('game');

new Game(app).start();
