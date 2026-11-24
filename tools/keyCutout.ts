// Removes a pure green background from a render, trims and resizes it.
// Usage: node tools/keyCutout.ts <in> <out.png> [width=256]
import sharp from 'sharp';
import { removeGreenScreen } from './imageUtils.ts';

const [input, output, widthArg] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node tools/keyCutout.ts <in> <out.png> [width=256]');
  process.exit(1);
}
const width = Number(widthArg ?? 256);

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
removeGreenScreen(data);

const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim()
  .png()
  .toBuffer();
await sharp(trimmed).resize({ width }).png().toFile(output);
console.log(`${output} written`);
