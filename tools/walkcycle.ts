// Builds an 8-direction animation from 5 sheets, one per right-facing view, each holding
// `frames` figures in a row (left → right = frame order). Left-facing directions are mirrored.
// Usage: node tools/walkcycle.ts <unit> <outDir> <S> <SE> <E> <NE> <N> [anim=walk] [frames=4] [height=256]
// Output: <outDir>/<unit>_<anim>_<dir>_<frame>.png, dir 0–7 clockwise from N (AGENTS.md §4).
import sharp from 'sharp';
import { sliceSheet } from './imageUtils.ts';

const [unit, outDir, ...rest] = process.argv.slice(2);
const sheets = rest.slice(0, 5);
const [anim = 'walk', framesArg, heightArg] = rest.slice(5);
if (!unit || !outDir || sheets.length !== 5) {
  console.error(
    'Usage: node tools/walkcycle.ts <unit> <outDir> <S> <SE> <E> <NE> <N> [anim=walk] [frames=4] [height=256]',
  );
  process.exit(1);
}
const frames = Number(framesArg ?? 4);
const height = Number(heightArg ?? 256);

// Sheet → direction (S, SE, E, NE, N) and the left-facing direction mirrored from it.
const SHEET_DIRS = [4, 3, 2, 1, 0];
const MIRROR_OF: Record<number, number> = { 3: 5, 2: 6, 1: 7 };

for (const [i, sheet] of sheets.entries()) {
  const dir = SHEET_DIRS[i];
  const views = await sliceSheet(sheet, frames, height);
  for (const [frame, png] of views.entries()) {
    const ff = String(frame).padStart(2, '0');
    await sharp(png).toFile(`${outDir}/${unit}_${anim}_${dir}_${ff}.png`);
    const mirrored = MIRROR_OF[dir];
    if (mirrored !== undefined) {
      await sharp(png).flop().toFile(`${outDir}/${unit}_${anim}_${mirrored}_${ff}.png`);
    }
  }
  console.log(
    `${sheet}: ${frames} frames → dir ${dir}${MIRROR_OF[dir] ? ` + ${MIRROR_OF[dir]}` : ''}`,
  );
}
