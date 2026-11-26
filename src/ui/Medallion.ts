import { Assets, Circle, Container, Sprite, Text, type Texture } from 'pixi.js';
import { uiAlias } from '../assets/manifest';
import { UI_ART_SCALE } from '../config';
import { medallionLook } from './PanelLayout';
import type { Tooltip } from './Tooltip';

export type IconName =
  | 'menu'
  | 'bell'
  | 'fullscreen'
  | 'collapse'
  | 'helmet'
  | 'sack'
  | 'book'
  | 'scroll'
  | 'compass'
  | 'flask'
  | 'sword';

/** On-screen icon side as a fraction of the medallion radius (≈ the inner disc with the file's margins). */
const ICON_SCALE = 1.3;
/** Icon files are 80 px squares; the medallion ring has radius 60 px in its 128 px file (30 design px). */
const ICON_FILE = 80;
const RING_R = 30;

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

const tex = (name: string) => Assets.get<Texture>(uiAlias(name));

/** Round bronze button: painted base + ivory icon, with hover / pressed / stub states. */
export class Medallion extends Container {
  private readonly face = new Container();
  private readonly base = new Sprite({ anchor: 0.5 });
  private readonly icon = new Sprite({ anchor: 0.5 });
  private hover = false;
  private pressed = false;

  constructor(
    private readonly o: MedallionOptions,
    private readonly tooltip: Tooltip,
  ) {
    super({ eventMode: 'static' });
    const R = o.size;
    this.hitArea = new Circle(0, 0, R);
    if (o.onPress && !o.stub) this.cursor = 'pointer';

    this.base.scale.set((R / RING_R) * UI_ART_SCALE);
    this.icon.alpha = o.stub ? 0.45 : 1;
    this.face.addChild(this.base, this.icon);
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
    this.addChild(this.face);
    this.setIcon(o.icon);
    this.refresh();

    this.on('pointerover', () => {
      this.hover = true;
      this.refresh();
      this.showTip();
    });
    this.on('pointerout', () => {
      this.hover = false;
      this.pressed = false;
      this.refresh();
      tooltip.hide();
    });
    this.on('pointerdown', () => {
      if (o.indicator) return;
      this.pressed = true;
      this.refresh();
      if (!o.stub) o.onPress?.();
    });
    const release = () => {
      this.pressed = false;
      this.refresh();
    };
    this.on('pointerup', release);
    this.on('pointerupoutside', release);
  }

  setIcon(icon: IconName | null): void {
    this.icon.visible = !!icon;
    if (!icon) return;
    this.icon.texture = tex(`icon_${icon}`);
    this.icon.scale.set((this.o.size * ICON_SCALE) / ICON_FILE);
  }

  setTitle(title: string): void {
    this.o.title = title;
    if (this.hover) this.showTip();
  }

  private showTip(): void {
    const { title, hotkey, note, stub } = this.o;
    const first = hotkey ? `${title} (${hotkey})` : title;
    const second = stub ? 'Ще недоступно' : note;
    const b = this.getBounds();
    this.tooltip.show(second ? [first, second] : [first], this.tooltip.edge, b.y + b.height / 2);
  }

  /** Base texture for the state; "pushed in" also shifts the face 1 px down. */
  private refresh(): void {
    const { stub, indicator } = this.o;
    this.base.texture = tex(
      `medallion_${medallionLook({ hover: this.hover, pressed: this.pressed, stub, indicator })}`,
    );
    this.face.y = this.pressed && !indicator ? 1 : 0;
  }
}
