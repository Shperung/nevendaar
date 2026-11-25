import { defineComponent, Types } from 'bitecs';

/** Gold this monster drops on death (GoldDef from loot.json). */
export const GoldDrop = defineComponent({
  chance: Types.f32,
  base: Types.f32,
  spread: Types.f32,
});
