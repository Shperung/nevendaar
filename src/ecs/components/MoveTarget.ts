import { defineComponent, Types } from 'bitecs';

/** Destination in tile space; removed when reached. */
export const MoveTarget = defineComponent({
  x: Types.f32,
  y: Types.f32,
});
