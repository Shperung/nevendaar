import { Container, Graphics, Text, type Rectangle } from 'pixi.js';
import { clampTooltip } from './PanelLayout';

const PAD = 8;
const GAP = 4;
const COLORS = [0xd8c8a0, 0x8a8070];

/** One shared tooltip: dark plate with a bronze frame and up to two lines, shown left of a point. */
export class Tooltip extends Container {
  private readonly bg = new Graphics();
  private readonly lines = COLORS.map(
    (fill) => new Text({ style: { fontSize: 14, fill, fontFamily: 'Georgia, serif' } }),
  );
  /** Screen x the panel tooltips hang from (the panel's left edge); set on layout. */
  edge = 0;

  constructor(private readonly screen: Rectangle) {
    super({ visible: false, eventMode: 'none' });
    this.addChild(this.bg, ...this.lines);
  }

  /** Right edge at `anchorX`, vertically centered on `anchorY` and kept on screen (screen pixels). */
  show(lines: string[], anchorX: number, anchorY: number): void {
    let w = 0;
    let h = PAD;
    this.lines.forEach((t, i) => {
      t.visible = i < lines.length;
      if (!t.visible) return;
      t.resolution = window.devicePixelRatio;
      t.text = lines[i];
      t.position.set(PAD, h);
      h += t.height + (i < lines.length - 1 ? GAP : 0);
      w = Math.max(w, t.width);
    });
    w += PAD * 2;
    h += PAD;
    this.bg
      .clear()
      .rect(0, 0, w, h)
      .fill(0x15130f)
      .stroke({ color: 0x6b5a3a, width: 2, alignment: 1 })
      .rect(3, 3, w - 6, h - 6)
      .stroke({ color: 0x2e2a24, width: 1 });
    this.position.set(
      Math.max(0, anchorX - w),
      clampTooltip(anchorY - h / 2, h, this.screen.height),
    );
    this.visible = true;
  }

  hide(): void {
    this.visible = false;
  }
}
