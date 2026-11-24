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
