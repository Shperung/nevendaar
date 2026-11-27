import { defineComponent, Types } from 'bitecs';

/** Artifacts this monster drops on death: `rolls` tries of `chance`, rolled at item level `ilvl`. */
export const ItemDrop = defineComponent({
  rolls: Types.ui8,
  chance: Types.f32,
  ilvl: Types.ui8,
});
