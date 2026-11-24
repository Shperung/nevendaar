// Slices a 5-view turnaround sheet into 8 direction sprites.
// Sheet order (left → right): front, front 3/4 right, right profile, back 3/4 right, back.
// Left-facing directions are mirrored from the right-facing ones.
// Usage: node tools/turnaround.ts <sheet> <unit> <outDir> [anim=idle] [height=256]
// Output: <outDir>/<unit>_<anim>_<dir>_00.png, dir 0–7 clockwise from N (AGENTS.md §4).
import sharp from 'sharp';
import { removeBackground } from './imageUtils.ts';

const [sheet, unit, outDir, anim = 'idle', heightArg] = process.argv.slice(2);
if (!sheet || !unit || !outDir) {
  console.error('Usage: node tools/turnaround.ts <sheet> <unit> <outDir> [anim=idle] [height=256]');
  process.exit(1);
}
const height = Number(heightArg ?? 256);

// Sheet view index → direction; mirrored views: [source dir, mirrored dir].
const VIEW_DIRS = [4, 3, 2, 1, 0]; // S, SE, E, NE, N
const MIRRORS = [
  [3, 5], // SE → SW
  [2, 6], // E → W
  [1, 7], // NE → NW
];
const MIN_VIEW_WIDTH = 40;

const { data, info } = await sharp(sheet).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: w, height: h } = info;
removeBackground(data, w, h);

const opaque = (x: number, y: number) => data[(y * w + x) * 4 + 3] > 0;

// Views are separated by fully transparent columns.
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
if (views.length !== VIEW_DIRS.length) {
  console.error(`Expected ${VIEW_DIRS.length} views, found ${views.length}`);
  process.exit(1);
}

// One shared vertical range keeps every view at the same scale and feet baseline.
let top = h;
let bottom = 0;
for (const v of views) {
  for (let y = 0; y < h; y++) {
    for (let x = v.left; x <= v.right; x++) {
      if (!opaque(x, y)) continue;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
  }
}

const raw = sharp(data, { raw: { width: w, height: h, channels: 4 } });
const file = (dir: number) => `${outDir}/${unit}_${anim}_${dir}_00.png`;
const crops = new Map<number, Buffer>();

for (const [i, v] of views.entries()) {
  const png = await raw
    .clone()
    .extract({ left: v.left, top, width: v.right - v.left + 1, height: bottom - top + 1 })
    .resize({ height })
    .png()
    .toBuffer();
  crops.set(VIEW_DIRS[i], png);
}
for (const [src, dst] of MIRRORS) {
  crops.set(dst, await sharp(crops.get(src)).flop().png().toBuffer());
}
for (const [dir, png] of crops) {
  await sharp(png).toFile(file(dir));
  console.log(`${file(dir)} written`);
}
