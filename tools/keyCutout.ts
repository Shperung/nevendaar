// Removes a pure green or magenta background from a render, trims and resizes it.
// Usage: node tools/keyCutout.ts <in> <out.png> [width=256] [key=green|magenta]
import sharp from 'sharp';
import { removeKeyColor, type KeyColor } from './imageUtils.ts';

const [input, output, widthArg, keyArg = 'green'] = process.argv.slice(2);
if (!input || !output || (keyArg !== 'green' && keyArg !== 'magenta')) {
  console.error('Usage: node tools/keyCutout.ts <in> <out.png> [width=256] [key=green|magenta]');
  process.exit(1);
}
const width = Number(widthArg ?? 256);

const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
removeKeyColor(data, keyArg as KeyColor);

const trimmed = await sharp(data, { raw: { width: info.width, height: info.height, channels: 4 } })
  .trim()
  .png()
  .toBuffer();
await sharp(trimmed).resize({ width }).png().toFile(output);
console.log(`${output} written`);
