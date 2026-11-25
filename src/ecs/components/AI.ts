import { defineComponent, Types } from 'bitecs';

/** Monster brain: notices the hero within `aggro` tiles and gives up the chase beyond `leash` tiles. */
export const AI = defineComponent({
  aggro: Types.f32,
  leash: Types.f32,
});
