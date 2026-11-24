/** Snapshot written by Pixi event handlers, consumed by the input system each fixed step. */
export const Input = {
  /** Last click in world-container screen space (origin = world (0,0)), or null. */
  click: null as { x: number; y: number } | null,
};
