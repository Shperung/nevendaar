/** Unit names; `Sprite.unit` stores an index into this list. */
export const UNITS = ['hero', 'skeleton', 'necro_warrior', 'zombie'] as const;

export const UnitId = {
  Hero: UNITS.indexOf('hero'),
  Skeleton: UNITS.indexOf('skeleton'),
  NecroWarrior: UNITS.indexOf('necro_warrior'),
  Zombie: UNITS.indexOf('zombie'),
} as const;

/** Animation clips; `Sprite.clip` stores an index into this list. `units` limits who has the frames. */
export const CLIPS = [
  { name: 'idle', frames: 1, fps: 1 },
  { name: 'walk', frames: 4, fps: 8 },
  { name: 'attack', frames: 4, fps: 10, units: ['hero'] },
] as const;

export const ClipId = { Idle: 0, Walk: 1, Attack: 2 } as const;

/** Texture alias following the atlas naming `{unit}_{anim}_{dir}_{frame}`. */
export function frameAlias(unit: number, anim: string, dir: number, frame: number): string {
  return `${UNITS[unit]}_${anim}_${dir}_${String(frame).padStart(2, '0')}`;
}

const DIRS = [0, 1, 2, 3, 4, 5, 6, 7];

export const manifest = {
  bundles: [
    {
      name: 'game',
      assets: UNITS.flatMap((name, unit) =>
        CLIPS.filter(
          (clip) => !('units' in clip) || (clip.units as readonly string[]).includes(name),
        ).flatMap((clip) =>
          DIRS.flatMap((dir) =>
            Array.from({ length: clip.frames }, (_, frame) => {
              const alias = frameAlias(unit, clip.name, dir, frame);
              return { alias, src: `assets/atlases/${alias}.png` };
            }),
          ),
        ),
      ),
    },
  ],
};
