// Builds the side panel and window UI art from raw generations in art/concepts/ui/<name>.(png|jpg) into
// public/assets/ui/ at 2× design size. Missing raws are skipped, so it can be run piecemeal.
// Usage: node tools/uiArt.ts [name...]
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import sharp from 'sharp';
import {
  cutHole,
  deriveMedallionState,
  fitPlacement,
  opaqueBounds,
  removeSampledKey,
  stoneGrade,
  type FitMode,
  type Rect,
} from './imageUtils.ts';

const RAW = 'art/concepts/ui';
const OUT = 'public/assets/ui';

interface Asset {
  name: string;
  /** Output file size in px. */
  w: number;
  h: number;
  /**
   * contain / stretch: fit the region onto `box`; caps: scale to the box width, keep the top and
   * bottom ends of the art plus a `mid` px strip from its center (9-slice source with tall end caps).
   */
  mode: FitMode | 'caps';
  /** caps: height of the center strip that the 9-slice stretches. */
  mid?: number;
  /** Target rectangle of the region (default: the whole canvas). */
  box?: Rect;
  /** Region = the transparent window cut by cutHole (frames) instead of the opaque bounds. */
  hole?: boolean;
  /** Alpha threshold of the opaque bounds (higher skips a soft outer shadow). */
  alpha?: number;
  /** Color grade (stoneGrade keep / gain): stone and metal go grey, parchment is only muted. */
  grade?: Grade;
  /** A whole painting with its own background: no key removal, cover-resized into `${name}.jpg`. */
  opaque?: boolean;
}

interface Grade {
  keep: number;
  gain: number;
}

const STONE: Grade = { keep: 0.3, gain: 1.12 };

const ICONS = [
  'menu',
  'bell',
  'fullscreen',
  'collapse',
  'helmet',
  'sack',
  'book',
  'scroll',
  'compass',
  'flask',
  'sword',
];

const ASSETS: Asset[] = [
  { name: 'panel_edge', grade: STONE, w: 28, h: 400, mode: 'stretch' },
  { name: 'panel_band', grade: STONE, w: 400, h: 28, mode: 'stretch' },
  { name: 'panel_crown', grade: STONE, w: 400, h: 160, mode: 'contain' },
  {
    name: 'frame_minimap',
    grade: STONE,
    w: 352,
    h: 272,
    mode: 'stretch',
    box: { x: 16, y: 16, w: 320, h: 240 },
    hole: true,
  },
  { name: 'panel_niche', grade: STONE, w: 296, h: 192, mode: 'caps', mid: 16 },
  {
    name: 'frame_portrait',
    grade: STONE,
    w: 184,
    h: 184,
    mode: 'stretch',
    box: { x: 16, y: 16, w: 152, h: 152 },
    hole: true,
  },
  { name: 'parchment', grade: { keep: 0.6, gain: 1 }, w: 180, h: 160, mode: 'stretch' },
  { name: 'panel_depth', grade: STONE, w: 400, h: 64, mode: 'contain' },
  { name: 'panel_dial', grade: STONE, w: 352, h: 352, mode: 'contain' },
  {
    name: 'gem_mount',
    grade: STONE,
    w: 168,
    h: 168,
    mode: 'stretch',
    box: { x: 24, y: 24, w: 120, h: 120 },
    hole: true,
  },
  { name: 'panel_finial', grade: STONE, w: 400, h: 80, mode: 'contain' },
  {
    name: 'medallion_normal',
    grade: STONE,
    w: 128,
    h: 128,
    mode: 'stretch',
    box: { x: 4, y: 4, w: 120, h: 120 },
    alpha: 200,
  },
  {
    name: 'inv_doll',
    grade: { keep: 0.6, gain: 1 },
    w: 1376,
    h: 800,
    mode: 'stretch',
    opaque: true,
  },
  { name: 'slot_diamond', grade: STONE, w: 160, h: 160, mode: 'contain' },
  ...ICONS.map((n): Asset => ({
    name: `icon_${n}`,
    w: 80,
    h: 80,
    mode: 'contain',
    box: { x: 4, y: 4, w: 72, h: 72 },
  })),
];

const only = process.argv.slice(2);
const wanted = (name: string) => only.length === 0 || only.includes(name);

function rawPath(name: string): string | null {
  for (const ext of ['png', 'jpg'])
    if (existsSync(`${RAW}/${name}.${ext}`)) return `${RAW}/${name}.${ext}`;
  return null;
}

/** Draws the RGBA image scaled by p onto a transparent w × h canvas, cropping whatever falls outside. */
async function place(
  data: Uint8Array,
  iw: number,
  ih: number,
  p: { scaleX: number; scaleY: number; left: number; top: number },
  w: number,
  h: number,
): Promise<sharp.Sharp> {
  const sw = Math.max(1, Math.round(iw * p.scaleX));
  const sh = Math.max(1, Math.round(ih * p.scaleY));
  const left = Math.max(0, -p.left);
  const top = Math.max(0, -p.top);
  const width = Math.min(sw - left, w - Math.max(0, p.left));
  const height = Math.min(sh - top, h - Math.max(0, p.top));
  const scaled = await sharp(data, { raw: { width: iw, height: ih, channels: 4 } })
    .resize(sw, sh, { fit: 'fill' })
    .extract({ left, top, width, height })
    .png()
    .toBuffer();
  return sharp({
    create: { width: w, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  }).composite([{ input: scaled, left: Math.max(0, p.left), top: Math.max(0, p.top) }]);
}

async function build(a: Asset, input: string): Promise<string> {
  const { data, info } = await sharp(input)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width: iw, height: ih } = info;
  if (a.opaque) {
    if (a.grade) stoneGrade(data, a.grade.keep, a.grade.gain);
    const out = `${OUT}/${a.name}.jpg`;
    await sharp(data, { raw: { width: iw, height: ih, channels: 4 } })
      .resize(a.w, a.h, { fit: 'cover' })
      .removeAlpha()
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(out);
    return out;
  }
  removeSampledKey(data, iw, ih);
  if (a.grade) stoneGrade(data, a.grade.keep, a.grade.gain);
  const box = a.box ?? { x: 0, y: 0, w: a.w, h: a.h };
  const region = a.hole ? cutHole(data, iw, ih) : opaqueBounds(data, iw, ih, a.alpha);
  if (!region) throw new Error(`${input}: ${a.hole ? 'no dark window in the center' : 'empty'}`);
  const out = `${OUT}/${a.name}.png`;

  if (a.mode === 'caps') {
    const artH = (region.h * box.w) / region.w;
    const mid = a.mid ?? 0;
    const cap = Math.floor((box.h - mid) / 2);
    const p = fitPlacement(region, { ...box, h: artH }, 'stretch');
    const top = await place(data, iw, ih, p, a.w, cap);
    // Same scale, shifted up: a strip from the art's vertical center, then its bottom edge.
    const strip = async (shift: number, h: number) =>
      (await place(data, iw, ih, { ...p, top: Math.round(p.top - shift) }, a.w, h))
        .png()
        .toBuffer();
    await sharp({
      create: { width: a.w, height: a.h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
    })
      .composite([
        { input: await top.png().toBuffer(), left: 0, top: 0 },
        { input: await strip((artH - mid) / 2, mid), left: 0, top: cap },
        { input: await strip(artH - (a.h - cap - mid), a.h - cap - mid), left: 0, top: cap + mid },
      ])
      .png({ compressionLevel: 9 })
      .toFile(out);
    return out;
  }

  const img = await place(data, iw, ih, fitPlacement(region, box, a.mode), a.w, a.h);
  await img.png({ compressionLevel: 9 }).toFile(out);
  return out;
}

/** Writes medallion_hover / _pressed / _disabled derived from the built medallion_normal. */
async function deriveStates(): Promise<string[]> {
  const { data, info } = await sharp(`${OUT}/medallion_normal.png`)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: 4 as const };
  return Promise.all(
    (['hover', 'pressed', 'disabled'] as const).map(async (s) => {
      const out = `${OUT}/medallion_${s}.png`;
      await sharp(deriveMedallionState(data, info.width, info.height, s), { raw })
        .png({ compressionLevel: 9 })
        .toFile(out);
      return out;
    }),
  );
}

mkdirSync(OUT, { recursive: true });
const written: string[] = [];

if (wanted('panel_stone')) {
  const input = rawPath('panel_stone');
  if (!input) console.warn('skip panel_stone: no raw file');
  else {
    // Generations often darken the outer edge; crop it off before making the tile seamless.
    const meta = await sharp(input).metadata();
    const inset = Math.round(meta.width * 0.05);
    const tmp = `${RAW}/panel_stone_cropped.png`;
    const { data, info } = await sharp(input)
      .extract({
        left: inset,
        top: inset,
        width: meta.width - 2 * inset,
        height: meta.height - 2 * inset,
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    // The tile is the panel's largest surface: a bit darker than the trim, like the reference slab.
    stoneGrade(data, STONE.keep, 0.9);
    await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
      .png()
      .toFile(tmp);
    execFileSync('node', ['tools/seamless.ts', tmp, `${OUT}/panel_stone.jpg`, '256'], {
      stdio: 'inherit',
    });
    written.push(`${OUT}/panel_stone.jpg`);
  }
}

for (const a of ASSETS) {
  if (!wanted(a.name)) continue;
  const input = rawPath(a.name);
  if (!input) {
    console.warn(`skip ${a.name}: no raw file in ${RAW}`);
    continue;
  }
  written.push(await build(a, input));
  if (a.name === 'medallion_normal') written.push(...(await deriveStates()));
}

let total = 0;
for (const f of written) {
  const size = statSync(f).size;
  total += size;
  console.log(`${f}  ${(size / 1024).toFixed(1)} KB`);
}
console.log(`${written.length} files, ${(total / 1024).toFixed(1)} KB`);
