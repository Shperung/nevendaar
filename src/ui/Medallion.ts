import { Circle, Container, Graphics, Text } from 'pixi.js';
import type { Tooltip } from './Tooltip';

const ICON_COLOR = 0xc8a96a;

/** Line-art icon silhouettes centered at (0, 0), fitting a circle of radius `r`; stroked by the caller. */
const ICONS = {
  menu: (g: Graphics, r: number) => {
    for (const y of [-0.5, 0, 0.5]) g.moveTo(-0.7 * r, y * r).lineTo(0.7 * r, y * r);
    return g;
  },
  bell: (g: Graphics, r: number) =>
    g
      .moveTo(-0.75 * r, 0.5 * r)
      .lineTo(0.75 * r, 0.5 * r)
      .moveTo(-0.55 * r, 0.5 * r)
      .bezierCurveTo(-0.55 * r, -1 * r, 0.55 * r, -1 * r, 0.55 * r, 0.5 * r)
      .circle(0, 0.75 * r, 0.15 * r),
  helmet: (g: Graphics, r: number) =>
    g
      .moveTo(-0.6 * r, 0.75 * r)
      .lineTo(-0.6 * r, -0.1 * r)
      .arc(0, -0.1 * r, 0.6 * r, Math.PI, 0)
      .lineTo(0.6 * r, 0.75 * r)
      .moveTo(-0.6 * r, 0.1 * r)
      .lineTo(0.6 * r, 0.1 * r)
      .moveTo(0, 0.1 * r)
      .lineTo(0, 0.65 * r),
  sack: (g: Graphics, r: number) =>
    g
      .moveTo(-0.25 * r, -0.55 * r)
      .lineTo(0.25 * r, -0.55 * r)
      .moveTo(-0.2 * r, -0.5 * r)
      .bezierCurveTo(-0.95 * r, 0, -0.8 * r, 0.8 * r, 0, 0.8 * r)
      .bezierCurveTo(0.8 * r, 0.8 * r, 0.95 * r, 0, 0.2 * r, -0.5 * r)
      .moveTo(-0.25 * r, -0.55 * r)
      .lineTo(-0.45 * r, -0.85 * r)
      .moveTo(0.25 * r, -0.55 * r)
      .lineTo(0.45 * r, -0.85 * r),
  book: (g: Graphics, r: number) =>
    g
      .moveTo(0, -0.5 * r)
      .lineTo(0, 0.6 * r)
      .moveTo(0, -0.5 * r)
      .quadraticCurveTo(-0.4 * r, -0.75 * r, -0.85 * r, -0.5 * r)
      .lineTo(-0.85 * r, 0.6 * r)
      .quadraticCurveTo(-0.4 * r, 0.35 * r, 0, 0.6 * r)
      .moveTo(0, -0.5 * r)
      .quadraticCurveTo(0.4 * r, -0.75 * r, 0.85 * r, -0.5 * r)
      .lineTo(0.85 * r, 0.6 * r)
      .quadraticCurveTo(0.4 * r, 0.35 * r, 0, 0.6 * r),
  scroll: (g: Graphics, r: number) =>
    g
      .ellipse(0, -0.6 * r, 0.6 * r, 0.15 * r)
      .ellipse(0, 0.6 * r, 0.6 * r, 0.15 * r)
      .moveTo(-0.5 * r, -0.55 * r)
      .lineTo(-0.5 * r, 0.55 * r)
      .moveTo(0.5 * r, -0.55 * r)
      .lineTo(0.5 * r, 0.55 * r)
      .moveTo(-0.3 * r, -0.2 * r)
      .lineTo(0.3 * r, -0.2 * r)
      .moveTo(-0.3 * r, 0.1 * r)
      .lineTo(0.3 * r, 0.1 * r),
  compass: (g: Graphics, r: number) =>
    g
      .poly([0, -0.9 * r, 0.45 * r, 0, 0, 0.9 * r, -0.45 * r, 0])
      .moveTo(-0.85 * r, 0)
      .lineTo(0.85 * r, 0)
      .circle(0, 0, 0.12 * r),
  flask: (g: Graphics, r: number) =>
    g
      .moveTo(-0.28 * r, -0.8 * r)
      .lineTo(0.28 * r, -0.8 * r)
      .moveTo(-0.15 * r, -0.8 * r)
      .lineTo(-0.15 * r, -0.28 * r)
      .moveTo(0.15 * r, -0.8 * r)
      .lineTo(0.15 * r, -0.28 * r)
      .circle(0, 0.25 * r, 0.55 * r),
  sword: (g: Graphics, r: number) =>
    g
      .moveTo(-0.55 * r, 0.55 * r)
      .lineTo(0.75 * r, -0.75 * r)
      .moveTo(-0.65 * r, 0.15 * r)
      .lineTo(-0.15 * r, 0.65 * r)
      .moveTo(-0.55 * r, 0.55 * r)
      .lineTo(-0.8 * r, 0.8 * r),
  fullscreen: (g: Graphics, r: number) => corners(g, r, 1),
  collapse: (g: Graphics, r: number) => corners(g, r, -1),
};

/** Four corner brackets pointing out (`dir` = 1, "expand") or in (`dir` = -1, "collapse"). */
function corners(g: Graphics, r: number, dir: number): Graphics {
  const a = 0.75 * r;
  const l = 0.4 * r * dir;
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      // With dir = -1 the bracket corner sits at the inner end, so the arms point outward.
      const cx = dir > 0 ? sx * a : sx * (a - 0.4 * r);
      const cy = dir > 0 ? sy * a : sy * (a - 0.4 * r);
      g.moveTo(cx - sx * l, cy)
        .lineTo(cx, cy)
        .lineTo(cx, cy - sy * l);
    }
  }
  return g;
}

export type IconName = keyof typeof ICONS;

export interface MedallionOptions {
  icon: IconName | null;
  /** Outer radius in panel design pixels. */
  size: number;
  title: string;
  hotkey?: string;
  /** Second tooltip line of a working button or indicator. */
  note?: string;
  /** Not implemented yet: dimmed icon, "Ще недоступно" tooltip, presses do nothing. */
  stub?: boolean;
  /** Pure indicator: tooltip only, no highlight or press. */
  indicator?: boolean;
  /** Small digit in the corner (belt slots). */
  badge?: string;
  onPress?: () => void;
}

/** Round bronze button: ring + dark disc + icon, with hover / pressed / stub states. */
export class Medallion extends Container {
  private readonly face = new Container();
  private readonly icon = new Graphics();
  private readonly glow = new Graphics({ visible: false });

  constructor(
    private readonly o: MedallionOptions,
    private readonly tooltip: Tooltip,
  ) {
    super({ eventMode: 'static' });
    const R = o.size;
    this.hitArea = new Circle(0, 0, R);
    if (o.onPress && !o.stub) this.cursor = 'pointer';

    const ring = new Graphics()
      .circle(0, 0, R)
      .fill(0x6b5a3a)
      .stroke({ color: 0x0e0d0b, width: 2 })
      .circle(0, 0, R - 2.5)
      .stroke({ color: 0x8a7a55, width: 1, alpha: 0.6 })
      .circle(0, 0, R * 0.72)
      .fill(0x15130f)
      .stroke({ color: 0x0e0d0b, width: 1.5 });
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      ring.circle(Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, Math.max(1, R * 0.06));
    }
    ring.fill(0x8a7a55);
    this.glow.circle(0, 0, R + 0.5).stroke({ color: ICON_COLOR, width: 2 });
    this.icon.alpha = o.stub ? 0.5 : 1;
    this.face.addChild(ring, this.icon);
    if (o.badge) {
      const badge = new Text({
        text: o.badge,
        style: {
          fontSize: R * 0.5,
          fill: 0xd8c8a0,
          fontWeight: 'bold',
          fontFamily: 'Georgia, serif',
        },
        anchor: 0.5,
      });
      badge.position.set(R * 0.62, R * 0.62);
      this.face.addChild(badge);
    }
    this.addChild(this.face, this.glow);
    this.setIcon(o.icon);

    this.on('pointerover', () => {
      if (!o.indicator) this.glow.visible = true;
      this.showTip();
    });
    this.on('pointerout', () => {
      this.glow.visible = false;
      tooltip.hide();
      this.press(false);
    });
    this.on('pointerdown', () => {
      if (o.indicator) return;
      this.press(true);
      if (!o.stub) o.onPress?.();
    });
    this.on('pointerup', () => this.press(false));
    this.on('pointerupoutside', () => this.press(false));
  }

  setIcon(icon: IconName | null): void {
    this.icon.clear();
    if (!icon) return;
    const r = this.o.size * 0.42;
    ICONS[icon](this.icon, r).stroke({
      color: ICON_COLOR,
      width: Math.max(1.5, r * 0.18),
      cap: 'round',
      join: 'round',
    });
  }

  setTitle(title: string): void {
    this.o.title = title;
    if (this.glow.visible) this.showTip();
  }

  private showTip(): void {
    const { title, hotkey, note, stub } = this.o;
    const first = hotkey ? `${title} (${hotkey})` : title;
    const second = stub ? 'Ще недоступно' : note;
    const b = this.getBounds();
    this.tooltip.show(second ? [first, second] : [first], this.tooltip.edge, b.y + b.height / 2);
  }

  /** "Pushed in": 1 px down and darker while held. */
  private press(down: boolean): void {
    this.face.y = down ? 1 : 0;
    this.face.tint = down ? 0xa0a0a0 : 0xffffff;
  }
}
