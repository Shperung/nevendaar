// Removes a flat light background (and its gray drop shadow) from a render, trims and resizes it.
// Usage: node tools/cutout.ts <in.png> <out.png> [height=256]
import sharp from 'sharp';

const [input, output, heightArg] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node tools/cutout.ts <in.png> <out.png> [height=256]');
  process.exit(1);
}
const height = Number(heightArg ?? 256);

// Background = neutral gray/white (r≈g≈b) brighter than this; flood-filled from the borders
// so neutral highlights inside the character are kept.
const MIN_BRIGHTNESS = 120;
const MAX_CHROMA = 4;

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;

const isBackground = (i: number): boolean => {
  const r = data[i * 4];
  const g = data[i * 4 + 1];
  const b = data[i * 4 + 2];
  return Math.max(r, g, b) - Math.min(r, g, b) <= MAX_CHROMA && Math.min(r, g, b) >= MIN_BRIGHTNESS;
};

const visited = new Uint8Array(w * h);
const stack: number[] = [];
for (let x = 0; x < w; x++) stack.push(x, (h - 1) * w + x);
for (let y = 0; y < h; y++) stack.push(y * w, y * w + w - 1);

while (stack.length) {
  const i = stack.pop() as number;
  if (visited[i] || !isBackground(i)) continue;
  visited[i] = 1;
  data[i * 4 + 3] = 0;
  const x = i % w;
  if (x > 0) stack.push(i - 1);
  if (x < w - 1) stack.push(i + 1);
  if (i >= w) stack.push(i - w);
  if (i < w * (h - 1)) stack.push(i + w);
}

await sharp(data, { raw: { width: w, height: h, channels: 4 } })
  .trim()
  .resize({ height })
  .png()
  .toFile(output);
console.log(`${output} written`);
