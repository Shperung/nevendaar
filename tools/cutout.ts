// Removes a flat light background (and its gray drop shadow) from a render, trims and resizes it.
// Usage: node tools/cutout.ts <in.png> <out.png> [height=256]
import sharp from 'sharp';
import { removeBackground } from './imageUtils.ts';

const [input, output, heightArg] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node tools/cutout.ts <in.png> <out.png> [height=256]');
  process.exit(1);
}
const height = Number(heightArg ?? 256);

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
removeBackground(data, info.width, info.height);

await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim()
  .resize({ height })
  .png()
  .toFile(output);
console.log(`${output} written`);
