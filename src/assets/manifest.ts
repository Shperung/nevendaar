/** Unit names; `Sprite.unit` stores an index into this list. */
export const UNITS = ['hero'] as const;

export const UnitId = { Hero: UNITS.indexOf('hero') } as const;

/** Texture alias following the atlas naming `{unit}_{anim}_{dir}_{frame}`. */
export function frameAlias(unit: number, anim: string, dir: number, frame: number): string {
  return `${UNITS[unit]}_${anim}_${dir}_${String(frame).padStart(2, '0')}`;
}

const DIRS = [0, 1, 2, 3, 4, 5, 6, 7];

export const manifest = {
  bundles: [
    {
      name: 'game',
      assets: DIRS.map((dir) => {
        const alias = frameAlias(UnitId.Hero, 'idle', dir, 0);
        return { alias, src: `assets/atlases/${alias}.png` };
      }),
    },
  ],
};
