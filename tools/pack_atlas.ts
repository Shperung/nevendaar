// Packs a unit's frames (<unit>_<anim>_<dir>_<frame>.png) into one atlas PNG + Pixi spritesheet JSON.
// Frame names in the JSON are the file names without .png, so Assets.get(frameAlias(...)) keeps working.
// Usage: node tools/pack_atlas.ts <unit> <framesDir> [outDir=public/assets/atlases]
// Output: <outDir>/<unit>.png, <outDir>/<unit>.json
import { readdirSync, writeFileSync } from 'node:fs';
import sharp from 'sharp';

const [unit, framesDir, outDir = 'public/assets/atlases'] = process.argv.slice(2);
if (!unit || !framesDir) {
  console.error(
    'Usage: node tools/pack_atlas.ts <unit> <framesDir> [outDir=public/assets/atlases]',
  );
  process.exit(1);
}

const MAX_WIDTH = 2048;
// Transparent gap between frames so linear filtering doesn't bleed neighbours into each other.
const PAD = 2;

const files = readdirSync(framesDir).filter((f) =>
  new RegExp(`^${unit}_[a-z]+_\\d_\\d+\\.png$`).test(f),
);
if (!files.length) throw new Error(`${framesDir}: no ${unit}_*.png frames`);

const frames = await Promise.all(
  files.map(async (file) => {
    const { width = 0, height = 0 } = await sharp(`${framesDir}/${file}`).metadata();
    return { file, name: file.slice(0, -4), w: width, h: height, x: 0, y: 0 };
  }),
);

// Shelf packing: tallest first, fill rows left → right, start a new row when the width runs out.
frames.sort((a, b) => b.h - a.h || a.name.localeCompare(b.name));
let x = PAD;
let y = PAD;
let rowH = 0;
let width = 0;
for (const f of frames) {
  if (x + f.w + PAD > MAX_WIDTH) {
    x = PAD;
    y += rowH + PAD;
    rowH = 0;
  }
  f.x = x;
  f.y = y;
  x += f.w + PAD;
  rowH = Math.max(rowH, f.h);
  width = Math.max(width, x);
}
const height = y + rowH + PAD;

await sharp({ create: { width, height, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(frames.map((f) => ({ input: `${framesDir}/${f.file}`, left: f.x, top: f.y })))
  .png()
  .toFile(`${outDir}/${unit}.png`);

const json = {
  frames: Object.fromEntries(
    frames.map((f) => [
      f.name,
      {
        frame: { x: f.x, y: f.y, w: f.w, h: f.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: f.w, h: f.h },
        sourceSize: { w: f.w, h: f.h },
      },
    ]),
  ),
  meta: { image: `${unit}.png`, format: 'RGBA8888', size: { w: width, h: height }, scale: 1 },
};
writeFileSync(`${outDir}/${unit}.json`, JSON.stringify(json, null, 2) + '\n');
console.log(`${outDir}/${unit}.png ${width}×${height}, ${frames.length} frames`);
