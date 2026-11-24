import { defineComponent, Types } from 'bitecs';

/** `texture` is an index into TEXTURES (assets/manifest.ts). */
export const Sprite = defineComponent({
  texture: Types.ui8,
});
