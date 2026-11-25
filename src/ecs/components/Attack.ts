import { defineComponent, Types } from 'bitecs';

/** Melee attack: `range` in tiles, `cooldown` in seconds; `timer` counts down to the next hit. */
export const Attack = defineComponent({
  damage: Types.f32,
  range: Types.f32,
  cooldown: Types.f32,
  timer: Types.f32,
});
