import { defineComponent, Types } from 'bitecs';

/** Hero's gold; f64 so whole amounts stay exact above 2^24. */
export const Wallet = defineComponent({
  gold: Types.f64,
});
