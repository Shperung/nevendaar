import sharp from 'sharp';

// Background = neutral gray/white (r≈g≈b) brighter than MIN_BRIGHTNESS, flood-filled from the
// borders so neutral highlights inside the character are kept. Enclosed holes (e.g. between legs)
// are removed only if they are near-white and larger than MIN_HOLE_PIXELS.
const MIN_BRIGHTNESS = 120;
const MIN_HOLE_BRIGHTNESS = 225;
const MAX_CHROMA = 6;
const MIN_HOLE_PIXELS = 40;

/** Makes the light neutral background transparent (RGBA buffer, in place). */
export function removeBackground(data: Uint8Array, w: number, h: number): void {
  const isNeutral = (i: number, minBrightness: number): boolean => {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    return (
      Math.max(r, g, b) - Math.min(r, g, b) <= MAX_CHROMA && Math.min(r, g, b) >= minBrightness
    );
  };

  const visited = new Uint8Array(w * h);
  const flood = (seeds: number[], minBrightness: number): number[] => {
    const region: number[] = [];
    const stack = seeds;
    while (stack.length) {
      const i = stack.pop() as number;
      if (visited[i] || !isNeutral(i, minBrightness)) continue;
      visited[i] = 1;
      region.push(i);
      const x = i % w;
      if (x > 0) stack.push(i - 1);
      if (x < w - 1) stack.push(i + 1);
      if (i >= w) stack.push(i - w);
      if (i < w * (h - 1)) stack.push(i + w);
    }
    return region;
  };
  const clear = (region: number[]) => region.forEach((i) => (data[i * 4 + 3] = 0));

  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  clear(flood(border, MIN_BRIGHTNESS));

  for (let i = 0; i < w * h; i++) {
    if (visited[i] || !isNeutral(i, MIN_HOLE_BRIGHTNESS)) continue;
    const hole = flood([i], MIN_HOLE_BRIGHTNESS);
    if (hole.length >= MIN_HOLE_PIXELS) clear(hole);
  }
}

// Chroma key: "keyness" = how much the key channels exceed the others (green: g - max(r, b);
// magenta: min(r, b) - g). Below KEY_SOLID the pixel is kept, above KEY_CLEAR it is removed,
// in between alpha ramps linearly (soft anti-aliased edges).
const KEY_SOLID = 25;
const KEY_CLEAR = 110;

export type KeyColor = 'green' | 'magenta';

/**
 * Makes a pure green (#00FF00) or magenta (#FF00FF) background transparent and removes the
 * key color spill (RGBA, in place). Use magenta for green subjects such as trees.
 */
export function removeKeyColor(data: Uint8Array, key: KeyColor): void {
  for (let i = 0; i < data.length; i += 4) {
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const keyness = key === 'green' ? g - Math.max(r, b) : Math.min(r, b) - g;
    if (keyness <= 0) continue;
    const t = (keyness - KEY_SOLID) / (KEY_CLEAR - KEY_SOLID);
    data[i + 3] = Math.round(255 * (1 - Math.min(Math.max(t, 0), 1)));
    if (key === 'green') data[i + 1] = g - keyness;
    else [data[i], data[i + 2]] = [r - keyness, b - keyness];
  }
}

// Sampled key: generators paint "magenta" as anything from #FF00FF to #BE1660, so the real background
// color is averaged from the four corners. Pixels closer than SAMPLED_CLEAR to it and connected to the
// border are the background; closed holes (rings, frames) are seeded by pixels closer than SAMPLED_SEED,
// which is tight enough to leave dim glows in the key's hue alone. Only a thin band (EDGE_BAND px) around it is treated as anti-aliased
// edge: alpha ramps with the distance up to SAMPLED_SOLID and the color is un-mixed
// (c = (c − (1 − a)·bg) / a) so no pink fringe is left. Dark bronze is about as far from the
// background as the edge pixels, so a global ramp would make the whole object translucent.
const SAMPLED_CLEAR = 70;
const SAMPLED_SEED = 25;
const SAMPLED_SOLID = 180;
const EDGE_BAND = 2;
const CORNER = 8;

/** Removes a flat background of whatever color the corners have (RGBA, in place). */
export function removeSampledKey(data: Uint8Array, w: number, h: number): void {
  const bg = [0, 0, 0];
  let n = 0;
  for (const [cx, cy] of [
    [0, 0],
    [w - CORNER, 0],
    [0, h - CORNER],
    [w - CORNER, h - CORNER],
  ]) {
    for (let y = cy; y < cy + CORNER; y++) {
      for (let x = cx; x < cx + CORNER; x++) {
        for (let k = 0; k < 3; k++) bg[k] += data[(y * w + x) * 4 + k];
        n++;
      }
    }
  }
  for (let k = 0; k < 3; k++) bg[k] /= n;
  const dist = (p: number) =>
    Math.hypot(data[p * 4] - bg[0], data[p * 4 + 1] - bg[1], data[p * 4 + 2] - bg[2]);

  // Background: flood from the border; band[p] = distance in px to it (0 = background).
  const band = new Uint8Array(w * h).fill(255);
  let front: number[] = [];
  for (let x = 0; x < w; x++) front.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) front.push(y * w, y * w + w - 1);
  for (let p = 0; p < w * h; p++) if (dist(p) < SAMPLED_SEED) front.push(p);
  while (front.length) {
    const p = front.pop() as number;
    if (band[p] === 0 || dist(p) >= SAMPLED_CLEAR) continue;
    band[p] = 0;
    data[p * 4 + 3] = 0;
    const x = p % w;
    if (x > 0) front.push(p - 1);
    if (x < w - 1) front.push(p + 1);
    if (p >= w) front.push(p - w);
    if (p < w * (h - 1)) front.push(p + w);
  }
  for (let step = 1; step <= EDGE_BAND; step++) {
    front = [];
    for (let p = 0; p < w * h; p++) {
      if (band[p] !== 255) continue;
      const x = p % w;
      const near = (q: number) => band[q] === step - 1;
      if (
        (x > 0 && near(p - 1)) ||
        (x < w - 1 && near(p + 1)) ||
        (p >= w && near(p - w)) ||
        (p < w * (h - 1) && near(p + w))
      )
        front.push(p);
    }
    for (const p of front) {
      band[p] = step;
      const a = Math.min(
        Math.max((dist(p) - SAMPLED_CLEAR) / (SAMPLED_SOLID - SAMPLED_CLEAR), 0),
        1,
      );
      if (a === 1) continue;
      const i = p * 4;
      data[i + 3] = Math.round(a * data[i + 3]);
      if (a === 0) continue;
      for (let k = 0; k < 3; k++) {
        const c = (data[i + k] - (1 - a) * bg[k]) / a;
        data[i + k] = Math.round(Math.min(Math.max(c, 0), 255));
      }
    }
  }
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Bounding box of the pixels with alpha above `threshold`; null when there are none. */
export function opaqueBounds(data: Uint8Array, w: number, h: number, threshold = 127): Rect | null {
  let [x0, y0, x1, y1] = [w, h, -1, -1];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] <= threshold) continue;
      x0 = Math.min(x0, x);
      x1 = Math.max(x1, x);
      y0 = Math.min(y0, y);
      y1 = Math.max(y1, y);
    }
  }
  return x1 < 0 ? null : { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export type FitMode = 'contain' | 'stretch';

/**
 * Where to draw the whole image so that its region `src` lands in `box`: the image is scaled by
 * (scaleX, scaleY) and its top-left corner goes to (left, top). `contain` keeps the aspect ratio and
 * centers `src` in `box`; `stretch` fills `box` exactly.
 */
export function fitPlacement(
  src: Rect,
  box: Rect,
  mode: FitMode,
): { scaleX: number; scaleY: number; left: number; top: number } {
  let scaleX = box.w / src.w;
  let scaleY = box.h / src.h;
  if (mode === 'contain') scaleX = scaleY = Math.min(scaleX, scaleY);
  const left = Math.round(box.x + (box.w - src.w * scaleX) / 2 - src.x * scaleX);
  const top = Math.round(box.y + (box.h - src.h * scaleY) / 2 - src.y * scaleY);
  return { scaleX, scaleY, left, top };
}

/**
 * Flood-fills the near-black window around the image center (max(r, g, b) < threshold) and makes it
 * transparent. Returns the window's bounding box, or null when the center isn't dark.
 */
export function cutHole(data: Uint8Array, w: number, h: number, threshold = 40): Rect | null {
  const dark = (i: number) =>
    data[i * 4 + 3] > 0 && Math.max(data[i * 4], data[i * 4 + 1], data[i * 4 + 2]) < threshold;
  const start = Math.floor(h / 2) * w + Math.floor(w / 2);
  if (!dark(start)) return null;
  const stack = [start];
  let [x0, y0, x1, y1] = [w, h, -1, -1];
  while (stack.length) {
    const i = stack.pop() as number;
    if (!dark(i)) continue;
    data[i * 4 + 3] = 0;
    const x = i % w;
    const y = (i - x) / w;
    x0 = Math.min(x0, x);
    x1 = Math.max(x1, x);
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
    if (x > 0) stack.push(i - 1);
    if (x < w - 1) stack.push(i + 1);
    if (y > 0) stack.push(i - w);
    if (y < h - 1) stack.push(i + w);
  }
  return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
}

export type MedallionState = 'hover' | 'pressed' | 'disabled';

const HOVER_GOLD = [0xc8, 0xa9, 0x6a];

/**
 * Derives a button state from the `normal` medallion (RGB only, alpha untouched; returns a copy).
 * The ring is the annulus [0.72·R, R] around the center, R = 30/64 of the width (design: ring
 * radius 30 in a 64 px square).
 */
export function deriveMedallionState(
  data: Uint8Array,
  w: number,
  h: number,
  state: MedallionState,
): Uint8Array {
  const out = data.slice();
  const R = (30 / 64) * w;
  const clamp = (v: number) => Math.round(Math.min(Math.max(v, 0), 255));
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const dx = x + 0.5 - w / 2;
      const dy = y + 0.5 - h / 2;
      const dist = Math.hypot(dx, dy);
      // 0 at the inner edge of the ring, 1 at its outer edge; < 0 / > 1 outside it.
      const t = (dist - 0.72 * R) / (0.28 * R);
      const onRing = t >= 0 && t <= 1;
      let [r, g, b] = [out[i], out[i + 1], out[i + 2]];
      if (state === 'hover') {
        [r, g, b] = [r * 1.15, g * 1.15, b * 1.15];
        if (onRing) {
          const k = 0.35 * t;
          [r, g, b] = [r, g, b].map((c, j) => c + (HOVER_GOLD[j] - c) * k);
        }
      } else if (state === 'pressed') {
        let f = 0.75;
        // Inner shadow: up to 40 % darker at the top of the ring, fading to none at the bottom.
        if (onRing) f *= 1 - 0.4 * ((1 - dy / dist) / 2);
        [r, g, b] = [r * f, g * f, b * f];
      } else {
        const lum = 0.299 * r + 0.587 * g + 0.114 * b;
        [r, g, b] = [r, g, b].map((c) => (lum + (c - lum) * 0.2) * 0.85);
      }
      [out[i], out[i + 1], out[i + 2]] = [clamp(r), clamp(g), clamp(b)];
    }
  }
  return out;
}

// Weathered stone of the panel: neutral grey with a faint olive cast (B a bit lower than R/G).
// Normalized so 0.299·r + 0.587·g + 0.114·b = 1, i.e. the tint keeps luminance.
const STONE_TINT = [1.02, 1.01, 0.9];

/**
 * Shifts warm bronze/brown art toward cool grey-olive stone (RGB only, in place): keeps `keep` of
 * each pixel's saturation (distance from its luminance), tints the result with STONE_TINT and
 * multiplies brightness by `gain`.
 */
export function stoneGrade(data: Uint8Array, keep = 0.3, gain = 1.12): void {
  for (let i = 0; i < data.length; i += 4) {
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    for (let k = 0; k < 3; k++) {
      const c = (lum + (data[i + k] - lum) * keep) * STONE_TINT[k] * gain;
      data[i + k] = Math.round(Math.min(Math.max(c, 0), 255));
    }
  }
}

const MIN_VIEW_WIDTH = 40;

/**
 * Cuts a sheet of `count` figures in a row (separated by background columns) into PNGs of the
 * given height. All figures share one vertical range, so scale and feet baseline stay consistent
 * (walk bob is preserved). Each crop is padded so its horizontal center is the figure's topmost
 * pixel (helmet tip): a sprite anchored at x=0.5 then doesn't jitter as the stride changes width.
 * Without `key` the background is light neutral, otherwise a chroma key color.
 */
export async function sliceSheet(sheet: string, count: number, height: number, key?: KeyColor) {
  const { data, info } = await sharp(sheet)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  if (key) removeKeyColor(data, key);
  else removeBackground(data, w, h);
  // Half-transparent chroma-key fringe (e.g. faint ground shadow) doesn't count as figure.
  const opaque = (x: number, y: number) => data[(y * w + x) * 4 + 3] > 127;

  const views: { left: number; right: number }[] = [];
  let start = -1;
  for (let x = 0; x <= w; x++) {
    let filled = false;
    for (let y = 0; x < w && y < h && !filled; y++) filled = opaque(x, y);
    if (filled && start < 0) start = x;
    if (!filled && start >= 0) {
      if (x - start >= MIN_VIEW_WIDTH) views.push({ left: start, right: x - 1 });
      start = -1;
    }
  }
  if (views.length !== count)
    throw new Error(`${sheet}: expected ${count} views, found ${views.length}`);

  let top = h;
  let bottom = 0;
  const tips = views.map((v) => {
    let tip = { x: v.left, y: h };
    for (let y = 0; y < h; y++) {
      for (let x = v.left; x <= v.right; x++) {
        if (!opaque(x, y)) continue;
        if (y < tip.y) tip = { x, y };
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
    return tip.x;
  });
  const raw = sharp(data, { raw: { width: w, height: h, channels: 4 } });
  return Promise.all(
    views.map(async (v, i) => {
      const half = Math.max(tips[i] - v.left, v.right - tips[i]) + 1;
      const cropped = await raw
        .clone()
        .extract({ left: v.left, top, width: v.right - v.left + 1, height: bottom - top + 1 })
        .png()
        .toBuffer();
      return sharp(cropped)
        .extend({
          left: half - (tips[i] - v.left),
          right: half - (v.right - tips[i]),
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .resize({ height })
        .png()
        .toBuffer();
    }),
  );
}
