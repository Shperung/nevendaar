import { defineComponent, Types } from 'bitecs';

/** Entity being chased and hit; removed when the target dies or the player clicks elsewhere. */
export const AttackTarget = defineComponent({
  eid: Types.ui32,
});
