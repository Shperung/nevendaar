import { Application, Container, Graphics } from 'pixi.js';

const SIZE = 36;
const MARGIN = 12;

/** Top-right button that toggles browser fullscreen. */
export function createFullscreenButton(app: Application): Container {
  const button = new Container({ eventMode: 'static', cursor: 'pointer' });
  const bg = new Graphics()
    .roundRect(0, 0, SIZE, SIZE, 6)
    .fill({ color: 0x000000, alpha: 0.5 })
    .stroke({ color: 0xc8a96a, width: 2 });
  // Four corner brackets — the usual "expand" icon.
  const p = 9;
  const l = 7;
  const s = SIZE - p;
  const icon = new Graphics()
    .moveTo(p, p + l)
    .lineTo(p, p)
    .lineTo(p + l, p)
    .moveTo(s - l, p)
    .lineTo(s, p)
    .lineTo(s, p + l)
    .moveTo(s, s - l)
    .lineTo(s, s)
    .lineTo(s - l, s)
    .moveTo(p + l, s)
    .lineTo(p, s)
    .lineTo(p, s - l)
    .stroke({ color: 0xc8a96a, width: 2 });
  button.addChild(bg, icon);

  button.on('pointerdown', (e) => {
    e.stopPropagation();
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen();
  });

  const place = () => button.position.set(app.screen.width - SIZE - MARGIN, MARGIN);
  place();
  app.renderer.on('resize', place);
  return button;
}
