import { defineComponent, Types } from 'bitecs';

/** World position in tile space; prevX/prevY hold the previous step for render interpolation. */
export const Position = defineComponent({
  x: Types.f32,
  y: Types.f32,
  prevX: Types.f32,
  prevY: Types.f32,
});
