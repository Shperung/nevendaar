// Slices a 5-view turnaround sheet into 8 direction sprites.
// Sheet order (left → right): front, front 3/4 right, right profile, back 3/4 right, back.
// Left-facing directions are mirrored from the right-facing ones.
// Usage: node tools/turnaround.ts <sheet> <unit> <outDir> [anim=idle] [height=256]
// Output: <outDir>/<unit>_<anim>_<dir>_00.png, dir 0–7 clockwise from N (AGENTS.md §4).
import sharp from 'sharp';
import { sliceSheet } from './imageUtils.ts';

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

const views = await sliceSheet(sheet, VIEW_DIRS.length, height);
const crops = new Map<number, Buffer>(views.map((png, i) => [VIEW_DIRS[i], png]));
for (const [src, dst] of MIRRORS) {
  crops.set(dst, await sharp(crops.get(src)).flop().png().toBuffer());
}
for (const [dir, png] of crops) {
  const file = `${outDir}/${unit}_${anim}_${dir}_00.png`;
  await sharp(png).toFile(file);
  console.log(`${file} written`);
}
