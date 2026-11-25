import { defineComponent, Types } from 'bitecs';

/** Gold on the ground: `amount` coins, pickable once `delay` (seconds) reaches 0. */
export const GoldPile = defineComponent({
  amount: Types.ui32,
  delay: Types.f32,
});
