import {
  Assets,
  Circle,
  Container,
  Graphics,
  NineSliceSprite,
  Rectangle,
  Sprite,
  Text,
  TilingSprite,
  type Texture,
} from 'pixi.js';
import { uiAlias } from '../assets/manifest';
import { DEPTH, HERO_NAME, MINIMAP, PANEL_W, UI_ART_SCALE } from '../config';
import { Medallion, type MedallionOptions } from './Medallion';
import { bandYs, healthFraction, panelLayout, PANEL_BLOCKS, type BlockName } from './PanelLayout';
import type { Tooltip } from './Tooltip';

const INK = 0x2a1e12;
const SERIF = 'Georgia, serif';

const MINIMAP_X = (PANEL_W - MINIMAP.w) / 2;
const MINIMAP_Y = 10;
const PORTRAIT = { x: 14, y: 18, size: 76 };
const PARCHMENT = { x: 100, y: 16, w: 90, h: 80 };
const GEM_R = 30;
const RING = { cx: 100, cy: 88, orbit: 62, slot: 19 };
/** Half height of panel_band and the 9-slice caps of panel_niche (file px; the art is 2×). */
const BAND_HALF = 7;
const NICHE = { x: 26, w: 148, side: 32, cap: 88 };

const uiTexture = (name: string) => Assets.get<Texture>(uiAlias(name));

/** Panel art sprite at (x, y) in design pixels. */
function art(name: string, x = 0, y = 0): Sprite {
  return new Sprite({ texture: uiTexture(name), x, y, scale: UI_ART_SCALE });
}

export function toggleFullscreen(): void {
  const p = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen();
  // Refused in iframes or by browser policy; the panel just stays as is.
  p.catch(() => undefined);
}

/** Opaque right side panel: minimap, portrait with name / health / gold, health gem and buttons. */
export class Hud extends Container {
  /** Panel width on screen (screen pixels). */
  panelWidth = 0;
  /** Container at the minimap window's top-left corner. */
  readonly minimapSlot = new Container();

  private readonly stone = new TilingSprite({
    texture: uiTexture('panel_stone'),
    width: PANEL_W,
    tileScale: { x: UI_ART_SCALE, y: UI_ART_SCALE },
  });
  private readonly edges = [art('panel_edge'), art('panel_edge', PANEL_W)];
  private readonly niche = new NineSliceSprite({
    texture: uiTexture('panel_niche'),
    leftWidth: NICHE.side,
    rightWidth: NICHE.side,
    topHeight: NICHE.cap,
    bottomHeight: NICHE.cap,
    x: NICHE.x,
    scale: UI_ART_SCALE,
  });
  private readonly bands = PANEL_BLOCKS.map(() => art('panel_band'));
  private readonly blocks = {} as Record<BlockName, Container>;
  private readonly texts: Text[] = [];
  private readonly hpText = this.text('', 12, INK, true);
  private readonly goldText = this.text('', 12, INK, true);
  private readonly liquid = new Graphics();
  private readonly fullscreen: Medallion;
  /** Inventory toggle; shown pressed while the window is open. */
  readonly inventory: Medallion;
  private shown = { gold: -1, hp: -1, maxHp: -1 };

  constructor(
    private readonly tooltip: Tooltip,
    portrait: Texture,
    onInventory: () => void,
  ) {
    super({ eventMode: 'static' });
    this.edges[1].scale.x = -UI_ART_SCALE;
    this.niche.width = NICHE.w / UI_ART_SCALE;
    this.addChild(this.stone, this.niche, ...this.bands, ...this.edges);
    for (const { name } of PANEL_BLOCKS) {
      this.blocks[name] = new Container();
      this.addChild(this.blocks[name]);
    }
    // The panel swallows every press so it never reaches the stage (no click, no hold).
    this.on('pointerdown', (e) => e.stopPropagation());

    this.fullscreen = this.medallion('crown', 100, 40, {
      icon: 'fullscreen',
      size: 28,
      title: 'Повний екран',
      hotkey: 'F',
      onPress: toggleFullscreen,
    });
    document.addEventListener('fullscreenchange', () => {
      const on = !!document.fullscreenElement;
      this.fullscreen.setIcon(on ? 'collapse' : 'fullscreen');
      this.fullscreen.setTitle(on ? 'Вийти з повного екрана' : 'Повний екран');
    });
    this.drawCrown();
    this.drawMinimapFrame();
    this.inventory = this.drawRow(onInventory);
    this.drawPortrait(portrait);
    this.drawDepth();
    this.drawRing();
    this.drawFinial();
  }

  layout(screenW: number, screenH: number): void {
    const l = panelLayout(screenW, screenH);
    this.scale.set(l.scale);
    this.position.set(l.x, 0);
    this.panelWidth = l.width;
    this.tooltip.edge = l.x - 4;
    for (const { name } of PANEL_BLOCKS) this.blocks[name].y = l.blocks[name];
    const h = screenH / l.scale;
    this.hitArea = new Rectangle(0, 0, PANEL_W, h);
    this.drawBackground(h, l.blocks, l.columnH);
    // Text is rasterized at its own resolution, so match the panel scale to keep it crisp.
    for (const t of this.texts) t.resolution = window.devicePixelRatio * l.scale;
  }

  /** Redraws texts and the gem only when the values changed. */
  update(v: { gold: number; hp: number; maxHp: number }): void {
    const s = this.shown;
    if (v.gold !== s.gold) this.goldText.text = String(v.gold);
    if (v.hp !== s.hp || v.maxHp !== s.maxHp) {
      this.hpText.text = `${Math.ceil(v.hp)} / ${v.maxHp}`;
      const f = healthFraction(v.hp, v.maxHp);
      const top = GEM_R - f * GEM_R * 2;
      this.liquid.clear();
      if (f > 0) {
        this.liquid
          .rect(-GEM_R, top, GEM_R * 2, GEM_R - top)
          .fill(0x7a1010)
          .rect(-GEM_R, top, GEM_R * 2, 2)
          .fill(0xb02020);
      }
    }
    this.shown = { ...v };
  }

  private text(text: string, size: number, fill: number, bold = false): Text {
    const t = new Text({
      text,
      style: { fontSize: size, fill, fontFamily: SERIF, fontWeight: bold ? 'bold' : 'normal' },
    });
    this.texts.push(t);
    return t;
  }

  private medallion(block: BlockName, x: number, y: number, o: MedallionOptions): Medallion {
    const m = new Medallion(o, this.tooltip);
    m.position.set(x, y);
    this.blocks[block].addChild(m);
    return m;
  }

  /** Stone tile, side moldings, the stretching niche and iron bands on block boundaries. */
  private drawBackground(h: number, blocks: Record<BlockName, number>, columnH: number): void {
    this.stone.height = h;
    for (const e of this.edges) e.height = h;
    this.niche.visible = columnH > 24;
    this.niche.y = blocks.column + 10;
    this.niche.height = (columnH - 20) / UI_ART_SCALE;
    const ys = bandYs(blocks, h);
    this.bands.forEach((b, i) => {
      b.visible = i < ys.length;
      b.y = (ys[i] ?? 0) - BAND_HALF;
    });
  }

  private drawCrown(): void {
    this.blocks.crown.addChildAt(art('panel_crown'), 0);
    this.medallion('crown', 34, 46, {
      icon: 'menu',
      size: 22,
      title: 'Меню',
      hotkey: 'Esc',
      stub: true,
    });
    this.medallion('crown', 166, 46, { icon: 'bell', size: 22, title: 'Звук', stub: true });
  }

  private drawMinimapFrame(): void {
    const { w, h } = MINIMAP;
    const x = MINIMAP_X;
    const y = MINIMAP_Y;
    const back = new Graphics().rect(x, y, w, h).fill(0x0e0d0b);
    this.minimapSlot.position.set(x, y);
    // The frame's window is transparent, so the map goes under it.
    this.blocks.minimap.addChild(back, this.minimapSlot, art('frame_minimap', x - 8, y - 8));
    this.medallion('minimap', 30, 148, {
      icon: 'compass',
      size: 11,
      title: 'Велика карта',
      hotkey: 'Tab',
      stub: true,
    });
  }

  /** Returns the inventory medallion, the only working one in the row. */
  private drawRow(onInventory: () => void): Medallion {
    const items: [MedallionOptions['icon'], string, string][] = [
      ['helmet', 'Персонаж', 'C'],
      ['sack', 'Інвентар', 'I'],
      ['book', 'Навички', 'S'],
      ['scroll', 'Журнал', 'Q'],
    ];
    const row = items.map(([icon, title, hotkey], i) => {
      const onPress = icon === 'sack' ? onInventory : undefined;
      return this.medallion('row', 31 + i * 46, 32, {
        icon,
        size: 21,
        title,
        hotkey,
        stub: !onPress,
        onPress,
      });
    });
    return row[1];
  }

  private drawPortrait(texture: Texture): void {
    const { x, y, size } = PORTRAIT;
    const back = new Graphics().rect(x, y, size, size).fill(0x1a1612);
    // Enlarged so the frame shows the upper part of the figure (atlas frames are cropped to the body).
    const hero = new Sprite({ texture, anchor: { x: 0.5, y: 0 } });
    hero.scale.set((size * 1.7) / texture.height);
    hero.position.set(x + size / 2, y + 4);
    const mask = new Graphics().rect(x, y, size, size).fill(0xffffff);
    hero.mask = mask;

    const p = PARCHMENT;
    const line = new Graphics()
      .rect(p.x + 8, p.y + 22, p.w - 16, 1)
      .fill({ color: INK, alpha: 0.4 });

    const name = this.text(HERO_NAME, 12, INK, true);
    name.anchor.set(0.5, 0);
    name.position.set(p.x + p.w / 2, p.y + 5);
    const hpLabel = this.text("Здоров'я", 10, INK);
    hpLabel.position.set(p.x + 8, p.y + 27);
    this.hpText.position.set(p.x + 8, p.y + 39);
    const coin = new Graphics()
      .circle(p.x + 15, p.y + 66, 6)
      .fill(0xd4a017)
      .stroke({ color: 0x7a5a00, width: 1.5 });
    this.goldText.anchor.set(0, 0.5);
    this.goldText.position.set(p.x + 26, p.y + 66);

    this.blocks.portrait.addChild(
      back,
      hero,
      mask,
      art('frame_portrait', x - 8, y - 8),
      art('parchment', p.x, p.y),
      line,
      name,
      hpLabel,
      this.hpText,
      coin,
      this.goldText,
    );
  }

  private drawDepth(): void {
    const depth = this.text(String(DEPTH), 13, INK, true);
    depth.anchor.set(0.5);
    depth.position.set(100, 16);
    this.blocks.depth.addChild(art('panel_depth'), depth);
  }

  private drawRing(): void {
    const { cx, cy, orbit, slot } = RING;
    const block = this.blocks.ring;
    const dial = art('panel_dial', cx, cy);
    dial.anchor.set(0.5);
    block.addChild(dial);

    // Slots clockwise from the top: LMB, RMB, belt 1–4.
    const slots: MedallionOptions[] = [
      { icon: 'sword', size: slot, title: 'Удар — ЛКМ', note: 'Ближня атака', indicator: true },
      { icon: null, size: slot, title: 'Навичка', hotkey: 'ПКМ', stub: true },
      ...[1, 2, 3, 4].map((n): MedallionOptions => ({
        icon: 'flask',
        size: slot,
        title: 'Зілля',
        hotkey: String(n),
        badge: String(n),
        stub: true,
      })),
    ];
    slots.forEach((o, i) => {
      const a = (i * Math.PI) / 3;
      this.medallion('ring', cx + Math.sin(a) * orbit, cy - Math.cos(a) * orbit, o);
    });

    const gem = new Container({ eventMode: 'static' });
    gem.position.set(cx, cy);
    gem.hitArea = new Circle(0, 0, GEM_R + 6);
    const glass = new Graphics().circle(0, 0, GEM_R).fill(0x0a0606);
    const glassMask = new Graphics().circle(0, 0, GEM_R).fill(0xffffff);
    this.liquid.mask = glassMask;
    const mount = art('gem_mount');
    mount.anchor.set(0.5);
    const shine = new Graphics().ellipse(-8, -15, 12, 6).fill({ color: 0xffffff, alpha: 0.22 });
    gem.addChild(glass, this.liquid, glassMask, mount, shine);
    gem.on('pointerover', () => {
      const b = gem.getBounds();
      this.tooltip.show(
        [`Здоров'я ${Math.ceil(this.shown.hp)} / ${this.shown.maxHp}`],
        this.tooltip.edge,
        b.y + b.height / 2,
      );
    });
    gem.on('pointerout', () => this.tooltip.hide());
    block.addChild(gem);
  }

  private drawFinial(): void {
    this.blocks.finial.addChild(art('panel_finial'));
  }
}
