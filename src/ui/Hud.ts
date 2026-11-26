import { Circle, Container, Graphics, Rectangle, Sprite, Text, type Texture } from 'pixi.js';
import { MINIMAP, PANEL_W } from '../config';
import { Medallion, type MedallionOptions } from './Medallion';
import { healthFraction, panelLayout, PANEL_BLOCKS, type BlockName } from './PanelLayout';
import type { Tooltip } from './Tooltip';

const STONE = 0x23201c;
const STONE_LIGHT = 0x2e2a24;
const BEVEL_LIGHT = 0x5a5244;
const BEVEL_DARK = 0x0e0d0b;
const IRON = 0x4a4438;
const RIVET = 0x8a7a55;
const GOLD = 0xc8a96a;
const BRONZE = 0x6b5a3a;
const INK = 0x2a1e12;
const SERIF = 'Georgia, serif';

const MINIMAP_X = (PANEL_W - MINIMAP.w) / 2;
const MINIMAP_Y = 10;
const PORTRAIT = { x: 14, y: 18, size: 76 };
const PARCHMENT = { x: 100, y: 16, w: 90, h: 80 };
const GEM_R = 30;
const RING = { cx: 100, cy: 88, orbit: 62, slot: 19 };

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

  private readonly bg = new Graphics();
  private readonly blocks = {} as Record<BlockName, Container>;
  private readonly texts: Text[] = [];
  private readonly hpText = this.text('', 12, INK, true);
  private readonly goldText = this.text('', 12, INK, true);
  private readonly liquid = new Graphics();
  private readonly fullscreen: Medallion;
  private shown = { gold: -1, hp: -1, maxHp: -1 };

  constructor(
    private readonly tooltip: Tooltip,
    portrait: Texture,
  ) {
    super({ eventMode: 'static' });
    this.addChild(this.bg);
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
    this.drawRow();
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

  /** Stone background, bevels, riveted iron bands between blocks and the stretching column. */
  private drawBackground(h: number, blocks: Record<BlockName, number>, columnH: number): void {
    const g = this.bg.clear();
    g.rect(0, 0, PANEL_W, h).fill(STONE);
    g.rect(8, 0, PANEL_W - 16, h).fill(STONE_LIGHT);
    // Bevels: light on the top/left edges, dark on the bottom/right ones.
    g.rect(0, 0, 1.5, h).fill(BEVEL_LIGHT);
    g.rect(PANEL_W - 1.5, 0, 1.5, h).fill(BEVEL_DARK);
    g.rect(8, 0, 1, h).fill(BEVEL_DARK);
    g.rect(PANEL_W - 9, 0, 1, h).fill(BEVEL_LIGHT);

    const c = blocks.column;
    if (columnH > 24) {
      // Recessed inset with bone-like ribs; only its height changes with the window.
      const x = 26;
      const w = PANEL_W - 52;
      g.rect(x, c + 10, w, columnH - 20).fill(0x1a1814);
      g.rect(x, c + 10, w, 1.5).fill(BEVEL_DARK);
      g.rect(x, c + 10, 1.5, columnH - 20).fill(BEVEL_DARK);
      g.rect(x, c + columnH - 11.5, w, 1.5).fill(BEVEL_LIGHT);
      g.rect(x + w - 1.5, c + 10, 1.5, columnH - 20).fill(BEVEL_LIGHT);
      g.rect(PANEL_W / 2 - 3, c + 14, 6, columnH - 28).fill(IRON);
      for (let y = c + 26; y < c + columnH - 22; y += 22) {
        g.moveTo(x + 8, y + 6)
          .quadraticCurveTo(PANEL_W / 2, y - 6, x + w - 8, y + 6)
          .stroke({ color: 0x3a352c, width: 3 });
      }
    }

    for (const { name } of PANEL_BLOCKS) if (blocks[name] > 0) this.band(g, blocks[name]);
    this.band(g, h - 4);
  }

  private band(g: Graphics, y: number): void {
    g.rect(0, y - 4, PANEL_W, 8).fill(IRON);
    g.rect(0, y - 4, PANEL_W, 1).fill(BEVEL_LIGHT);
    g.rect(0, y + 3, PANEL_W, 1).fill(BEVEL_DARK);
    for (const x of [6, 50, 150, PANEL_W - 6]) g.circle(x, y, 2);
    g.fill(RIVET);
    g.poly([PANEL_W / 2, y - 5, PANEL_W / 2 + 5, y, PANEL_W / 2, y + 5, PANEL_W / 2 - 5, y]).fill(
      GOLD,
    );
  }

  private drawCrown(): void {
    const g = new Graphics()
      // Pointed arch behind the middle medallion.
      .moveTo(58, 80)
      .lineTo(58, 36)
      .quadraticCurveTo(100, -6, 142, 36)
      .lineTo(142, 80)
      .fill(0x1a1814)
      .stroke({ color: BEVEL_LIGHT, width: 1.5 });
    this.blocks.crown.addChildAt(g, 0);
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
    const g = new Graphics()
      .rect(x - 7, y - 7, w + 14, h + 14)
      .fill(BRONZE)
      .stroke({ color: BEVEL_DARK, width: 1.5 })
      .rect(x - 3, y - 3, w + 6, h + 6)
      .fill(0x0e0d0b)
      .stroke({ color: RIVET, width: 1 });
    // Corner caps.
    for (const [cx, cy] of [
      [x - 7, y - 7],
      [x + w + 7, y - 7],
      [x - 7, y + h + 7],
      [x + w + 7, y + h + 7],
    ]) {
      g.poly([cx, cy - 7, cx + 7, cy, cx, cy + 7, cx - 7, cy]);
    }
    g.fill(GOLD).stroke({ color: BEVEL_DARK, width: 1 });
    this.minimapSlot.position.set(x, y);
    this.blocks.minimap.addChild(g, this.minimapSlot);
    this.medallion('minimap', 30, 148, {
      icon: 'compass',
      size: 11,
      title: 'Велика карта',
      hotkey: 'Tab',
      stub: true,
    });
  }

  private drawRow(): void {
    const items: [MedallionOptions['icon'], string, string][] = [
      ['helmet', 'Персонаж', 'C'],
      ['sack', 'Інвентар', 'I'],
      ['book', 'Навички', 'S'],
      ['scroll', 'Журнал', 'Q'],
    ];
    items.forEach(([icon, title, hotkey], i) =>
      this.medallion('row', 31 + i * 46, 32, { icon, size: 21, title, hotkey, stub: true }),
    );
  }

  private drawPortrait(texture: Texture): void {
    const { x, y, size } = PORTRAIT;
    const frame = new Graphics()
      .rect(x - 6, y - 6, size + 12, size + 12)
      .fill(BRONZE)
      .stroke({ color: BEVEL_DARK, width: 1.5 })
      .rect(x - 2, y - 2, size + 4, size + 4)
      .fill(0x0e0d0b);
    for (const [cx, cy] of [
      [x - 3, y - 3],
      [x + size + 3, y - 3],
      [x - 3, y + size + 3],
      [x + size + 3, y + size + 3],
    ]) {
      frame.circle(cx, cy, 2);
    }
    frame.fill(RIVET);
    const back = new Graphics().rect(x, y, size, size).fill(0x1a1612);
    // Enlarged so the frame shows the upper part of the figure (atlas frames are cropped to the body).
    const hero = new Sprite({ texture, anchor: { x: 0.5, y: 0 } });
    hero.scale.set((size * 1.7) / texture.height);
    hero.position.set(x + size / 2, y + 4);
    const mask = new Graphics().rect(x, y, size, size).fill(0xffffff);
    hero.mask = mask;

    const p = PARCHMENT;
    const parchment = new Graphics()
      .rect(p.x, p.y, p.w, p.h)
      .fill(0xcfc2a0)
      .stroke({ color: BEVEL_DARK, width: 2 });
    // A few faint stains.
    for (const [sx, sy, rx, ry] of [
      [p.x + 18, p.y + 60, 14, 8],
      [p.x + 70, p.y + 20, 10, 12],
      [p.x + 52, p.y + 70, 18, 6],
    ]) {
      parchment.ellipse(sx, sy, rx, ry);
    }
    parchment.fill({ color: 0x6a5530, alpha: 0.12 });
    parchment.rect(p.x + 8, p.y + 22, p.w - 16, 1).fill({ color: INK, alpha: 0.4 });

    const name = this.text('Мандрівник', 12, INK, true);
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
      frame,
      back,
      hero,
      mask,
      parchment,
      name,
      hpLabel,
      this.hpText,
      coin,
      this.goldText,
    );
  }

  private drawDepth(): void {
    const g = new Graphics()
      .rect(60, 15, 80, 2)
      .fill(IRON)
      .circle(100, 16, 13)
      .fill(BRONZE)
      .stroke({ color: BEVEL_DARK, width: 1.5 })
      .circle(100, 16, 10)
      .fill(0xd8ccae);
    const depth = this.text('1', 13, INK, true);
    depth.anchor.set(0.5);
    depth.position.set(100, 16);
    this.blocks.depth.addChild(g, depth);
  }

  private drawRing(): void {
    const { cx, cy, orbit, slot } = RING;
    const block = this.blocks.ring;
    block.addChild(
      new Graphics()
        .circle(cx, cy, orbit + slot + 4)
        .fill({ color: 0x1a1814 })
        .stroke({ color: BEVEL_LIGHT, width: 1.5 })
        .circle(cx, cy, orbit)
        .stroke({ color: IRON, width: 4 }),
    );

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
    const mount = new Graphics();
    // Four claws on the diagonals.
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      const along = (r: number, da: number) => [Math.cos(a + da) * r, Math.sin(a + da) * r];
      mount.poly([...along(GEM_R - 2, -0.3), ...along(GEM_R + 11, 0), ...along(GEM_R - 2, 0.3)]);
    }
    mount
      .fill(BRONZE)
      .stroke({ color: BEVEL_DARK, width: 1.5 })
      .circle(0, 0, GEM_R + 5)
      .fill(BRONZE)
      .stroke({ color: BEVEL_DARK, width: 2 })
      .circle(0, 0, GEM_R + 2)
      .stroke({ color: RIVET, width: 1 })
      .circle(0, 0, GEM_R)
      .fill(0x0a0606);
    const glassMask = new Graphics().circle(0, 0, GEM_R).fill(0xffffff);
    this.liquid.mask = glassMask;
    const shine = new Graphics()
      .ellipse(-8, -15, 12, 6)
      .fill({ color: 0xffffff, alpha: 0.22 })
      .circle(0, 0, GEM_R)
      .stroke({ color: 0x000000, width: 2, alpha: 0.6 });
    gem.addChild(mount, this.liquid, glassMask, shine);
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
    const g = new Graphics()
      .poly([60, 6, 140, 6, 100, 36])
      .fill(0x1a1814)
      .stroke({ color: BEVEL_LIGHT, width: 1.5 })
      .poly([100, 12, 107, 19, 100, 26, 93, 19])
      .fill(GOLD)
      .stroke({ color: BEVEL_DARK, width: 1 });
    this.blocks.finial.addChild(g);
  }
}
