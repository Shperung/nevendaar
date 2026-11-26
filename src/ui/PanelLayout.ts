import { PANEL_H, PANEL_MIN_VIEW, PANEL_SCALE, PANEL_W } from '../config';

// Pure geometry of the side panel (no Pixi imports, so it is unit-tested).

/** Panel blocks top to bottom with their design heights; `column` stretches to fill the height. */
export const PANEL_BLOCKS = [
  { name: 'crown', h: 80 },
  { name: 'minimap', h: 160 },
  { name: 'row', h: 64 },
  { name: 'column', h: 0 },
  { name: 'portrait', h: 112 },
  { name: 'depth', h: 32 },
  { name: 'ring', h: 176 },
  { name: 'finial', h: 40 },
] as const;

export type BlockName = (typeof PANEL_BLOCKS)[number]['name'];

/** Sum of the non-stretching block heights. */
export const FIXED_H = PANEL_BLOCKS.reduce((sum, b) => sum + b.h, 0);

export interface PanelLayout {
  scale: number;
  /** Left edge and width on screen, in screen pixels. */
  x: number;
  width: number;
  /** Stretching column height, in design pixels. */
  columnH: number;
  /** Top of each block, in design pixels. */
  blocks: Record<BlockName, number>;
}

export function panelLayout(screenW: number, screenH: number): PanelLayout {
  const [minS, maxS] = PANEL_SCALE;
  let scale = Math.min(maxS, Math.max(minS, screenH / PANEL_H));
  // Narrow window: shrink further so the game keeps PANEL_MIN_VIEW of the width (never below minS).
  scale = Math.max(minS, Math.min(scale, ((1 - PANEL_MIN_VIEW) * screenW) / PANEL_W));
  const width = PANEL_W * scale;
  // Whatever height the fixed blocks don't use (in design pixels) goes to the column.
  const columnH = Math.max(0, screenH / scale - FIXED_H);
  const blocks = {} as Record<BlockName, number>;
  let y = 0;
  for (const b of PANEL_BLOCKS) {
    blocks[b.name] = y;
    y += b.name === 'column' ? columnH : b.h;
  }
  return { scale, x: screenW - width, width, columnH, blocks };
}

/** Keeps a tooltip of height `h` with top `y` inside [0, screenH]. */
export function clampTooltip(y: number, h: number, screenH: number): number {
  return Math.max(0, Math.min(y, screenH - h));
}

/** Health fill fraction in [0, 1]; 0 when max is not positive. */
export function healthFraction(current: number, max: number): number {
  if (!(max > 0)) return 0;
  return Math.max(0, Math.min(1, current / max));
}
