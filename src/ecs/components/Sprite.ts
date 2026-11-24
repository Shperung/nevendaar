import { defineComponent, Types } from 'bitecs';

/**
 * `unit` indexes UNITS and `clip` indexes CLIPS (assets/manifest.ts); `dir` is the 8-way facing,
 * 0 = N, clockwise. `time` is seconds spent in the current clip, `frame` is derived from it.
 */
export const Sprite = defineComponent({
  unit: Types.ui8,
  dir: Types.ui8,
  clip: Types.ui8,
  frame: Types.ui8,
  time: Types.f32,
});
