import { defineComponent, Types } from 'bitecs';

/**
 * Entity being chased and hit; removed when the target dies or the player clicks elsewhere.
 * `repeat` = 1 keeps hitting (button held), 0 stops after one hit (single click).
 */
export const AttackTarget = defineComponent({
  eid: Types.ui32,
  repeat: Types.ui8,
});
