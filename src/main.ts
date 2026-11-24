import { Application } from 'pixi.js';
import { BG_COLOR } from './config';
import { Game } from './core/Game';

const app = new Application();
await app.init({ background: BG_COLOR, resizeTo: window, antialias: true });
document.body.appendChild(app.canvas);

new Game(app).start();
