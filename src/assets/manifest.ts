/** Unit names; `Sprite.unit` stores an index into this list. */
export const UNITS = ['hero'] as const;

export const UnitId = { Hero: UNITS.indexOf('hero') } as const;

/** Animation clips; `Sprite.clip` stores an index into this list. */
export const CLIPS = [
  { name: 'idle', frames: 1, fps: 1 },
  { name: 'walk', frames: 4, fps: 8 },
] as const;

export const ClipId = { Idle: 0, Walk: 1 } as const;

/** Texture alias following the atlas naming `{unit}_{anim}_{dir}_{frame}`. */
export function frameAlias(unit: number, anim: string, dir: number, frame: number): string {
  return `${UNITS[unit]}_${anim}_${dir}_${String(frame).padStart(2, '0')}`;
}

const DIRS = [0, 1, 2, 3, 4, 5, 6, 7];

export const manifest = {
  bundles: [
    {
      name: 'game',
      assets: CLIPS.flatMap((clip) =>
        DIRS.flatMap((dir) =>
          Array.from({ length: clip.frames }, (_, frame) => {
            const alias = frameAlias(UnitId.Hero, clip.name, dir, frame);
            return { alias, src: `assets/atlases/${alias}.png` };
          }),
        ),
      ),
    },
  ],
};
