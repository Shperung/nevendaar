/** Snapshot written by Pixi event handlers, consumed by the input system each fixed step. */
export const Input = {
  /** Last click in world-container screen space (origin = world (0,0)), or null. */
  click: null as { x: number; y: number } | null,
  /** Primary button / touch is held down. */
  held: false,
  /** Current pointer position in world-container screen space. */
  pointer: { x: 0, y: 0 },
  /** The pointer is over the side panel (`pointer` then keeps its last position in the game area). */
  overPanel: false,
};
