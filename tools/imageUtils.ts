import sharp from 'sharp';

// Background = neutral gray/white (r≈g≈b) brighter than MIN_BRIGHTNESS, flood-filled from the
// borders so neutral highlights inside the character are kept. Enclosed holes (e.g. between legs)
// are removed only if they are near-white and larger than MIN_HOLE_PIXELS.
const MIN_BRIGHTNESS = 120;
const MIN_HOLE_BRIGHTNESS = 225;
const MAX_CHROMA = 6;
const MIN_HOLE_PIXELS = 40;

/** Makes the light neutral background transparent (RGBA buffer, in place). */
export function removeBackground(data: Buffer, w: number, h: number): void {
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
export function removeKeyColor(data: Buffer, key: KeyColor): void {
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

const MIN_VIEW_WIDTH = 40;

/**
 * Cuts a sheet of `count` figures in a row (separated by background columns) into PNGs of the
 * given height. All figures share one vertical range, so scale and feet baseline stay consistent
 * (walk bob is preserved). Each crop is padded so its horizontal center is the figure's topmost
 * pixel (helmet tip): a sprite anchored at x=0.5 then doesn't jitter as the stride changes width.
 * Without `key` the background is light neutral, otherwise a chroma key color.
 */
export async function sliceSheet(
  sheet: string,
  count: number,
  height: number,
  key?: KeyColor,
): Promise<Buffer[]> {
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
