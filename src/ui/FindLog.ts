import { Container, Text } from 'pixi.js';

const MAX_LINES = 5;
/** Line lifetime and the final part of it spent fading out (ms). */
const LIFE = 4000;
const FADE = 1000;
const MARGIN = 16;
const LINE_H = 20;

/** Find log at the bottom left of the game area: «Знайдено: …» lines that fade out after 4 s. */
export class FindLog extends Container {
  private readonly lines: { text: Text; age: number }[] = [];

  constructor() {
    super({ eventMode: 'none' });
  }

  push(message: string, color: number): void {
    const text = new Text({
      text: message,
      resolution: window.devicePixelRatio,
      style: {
        fontSize: 15,
        fill: color,
        fontFamily: 'Georgia, serif',
        stroke: { color: 0x000000, width: 3 },
      },
      anchor: { x: 0, y: 1 },
    });
    this.addChild(text);
    this.lines.push({ text, age: 0 });
    while (this.lines.length > MAX_LINES) this.lines.shift()?.text.destroy();
    this.arrange();
  }

  update(dtMs: number): void {
    let expired = false;
    for (const line of this.lines) {
      line.age += dtMs;
      line.text.alpha = Math.min(1, (LIFE - line.age) / FADE);
      expired ||= line.age >= LIFE;
    }
    if (!expired) return;
    while (this.lines[0] && this.lines[0].age >= LIFE) this.lines.shift()?.text.destroy();
    this.arrange();
  }

  /** Bottom left corner of the screen (the game area starts at x = 0). */
  layout(screenH: number): void {
    this.position.set(MARGIN, screenH - MARGIN);
  }

  /** Newest line at the bottom. */
  private arrange(): void {
    const n = this.lines.length;
    this.lines.forEach((line, i) => (line.text.y = -(n - 1 - i) * LINE_H));
  }
}
