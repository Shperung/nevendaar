// Makes a square texture tile seamlessly and resizes it.
// Usage: node tools/seamless.ts <in> <out> [size=512]
import sharp from 'sharp';

const [input, output, sizeArg] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node tools/seamless.ts <in> <out> [size=512]');
  process.exit(1);
}
const size = Number(sizeArg ?? 512);

const { data, info } = await sharp(input)
  .resize(size, size)
  .removeAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const n = size;
const c = info.channels;

// Blend the image with a copy shifted by half its size. The shifted copy is continuous across
// the wrap-around edges, so it is used near the borders and fades into the original toward the center.
const out = Buffer.alloc(data.length);
const band = n / 4;
const smooth = (t: number) => t * t * (3 - 2 * t);
for (let y = 0; y < n; y++) {
  for (let x = 0; x < n; x++) {
    const edge = Math.min(x, n - 1 - x, y, n - 1 - y);
    const w = smooth(Math.min(edge / band, 1));
    const i = (y * n + x) * c;
    const j = (((y + n / 2) % n) * n + ((x + n / 2) % n)) * c;
    for (let k = 0; k < c; k++) out[i + k] = Math.round(data[i + k] * w + data[j + k] * (1 - w));
  }
}

await sharp(out, { raw: { width: n, height: n, channels: c } })
  .jpeg({ quality: 88 })
  .toFile(output);
console.log(`${output} written`);
