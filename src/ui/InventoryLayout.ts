// Pure geometry and formatting of the inventory window (no DOM or Pixi, so it is unit-tested).

/** Window design size in CSS pixels. */
export const INV = { w: 960, h: 640 };

/** Window scale: fits 92 % of the screen, never enlarged past the design size. */
export function inventoryScale(screenW: number, screenH: number): number {
  return Math.min(1, (screenW * 0.92) / INV.w, (screenH * 0.92) / INV.h);
}

export interface HeroStats {
  name: string;
  hp: number;
  maxHp: number;
  damage: number;
  /** Seconds between hits. */
  cooldown: number;
  /** Attack reach in tiles. */
  range: number;
  /** Tiles per second. */
  speed: number;
  gold: number;
  depth: number;
}

/** Hero panel rows [label, value] in display order (the name is the panel title, not a row). */
export function heroStatRows(s: HeroStats): [string, string][] {
  return [
    ["Здоров'я", `${Math.ceil(s.hp)} / ${s.maxHp}`],
    ['Шкода', String(Math.round(s.damage))],
    ['Швидкість атаки', `${(1 / s.cooldown).toFixed(1)} / с`],
    ['Дальність атаки', `${s.range.toFixed(1)} тайла`],
    ['Швидкість руху', `${s.speed.toFixed(1)} тайла/с`],
    ['Золото', s.gold.toLocaleString('uk-UA')],
    ['Глибина', String(s.depth)],
  ];
}
