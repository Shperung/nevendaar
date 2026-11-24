import { defineComponent, Types } from 'bitecs';

/** `unit` indexes UNITS (assets/manifest.ts); `dir` is the 8-way facing, 0 = N, clockwise. */
export const Sprite = defineComponent({
  unit: Types.ui8,
  dir: Types.ui8,
});
