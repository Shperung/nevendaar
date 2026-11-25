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
  { name: 'attack', frames: 4, fps: 10 },
] as const;

export const ClipId = { Idle: 0, Walk: 1, Attack: 2 } as const;

/** Whether the unit has frames for the clip. */
export function hasClip(unit: number, clip: number): boolean {
  const c = CLIPS[clip];
  return !('units' in c) || (c.units as readonly string[]).includes(UNITS[unit]);
}

/** Texture alias following the atlas naming `{unit}_{anim}_{dir}_{frame}`. */
export function frameAlias(unit: number, anim: string, dir: number, frame: number): string {
  return `${UNITS[unit]}_${anim}_${dir}_${String(frame).padStart(2, '0')}`;
}

const DIRS = [0, 1, 2, 3, 4, 5, 6, 7];

/** Units packed by tools/pack_atlas.ts into `{unit}.json`; the rest load one PNG per frame. */
const ATLAS_UNITS: readonly string[] = ['hero', 'skeleton', 'necro_warrior', 'zombie'];

export const manifest = {
  bundles: [
    {
      name: 'game',
      assets: UNITS.flatMap((name, unit) =>
        ATLAS_UNITS.includes(name)
          ? [{ alias: `${name}_atlas`, src: `assets/atlases/${name}.json` }]
          : CLIPS.filter((_, clip) => hasClip(unit, clip)).flatMap((clip) =>
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
