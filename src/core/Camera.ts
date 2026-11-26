import type { Container } from 'pixi.js';
import { CAMERA_EDGE } from '../config';

type Point = { x: number; y: number };
type Size = { width: number; height: number };

/** Dead-zone camera: moves `layer` only when the target leaves the central part of the viewport. */
export class Camera {
  /** `viewport` is the game area at the top-left of the screen (the screen minus the side panel). */
  constructor(
    private readonly viewport: () => Size,
    private readonly layer: Container,
  ) {}

  /** `p` is in layer-local (world screen) pixels. */
  centerOn(p: Point): void {
    const { width, height } = this.viewport();
    this.layer.position.set(width / 2 - p.x, height / 2 - p.y);
  }

  follow(p: Point): void {
    const { width, height } = this.viewport();
    this.layer.x = push(this.layer.x, p.x, width);
    this.layer.y = push(this.layer.y, p.y, height);
  }
}

/** Shifts the layer offset just enough to keep the target within [1-EDGE, EDGE] of `size`. */
function push(offset: number, target: number, size: number): number {
  const s = target + offset;
  const max = size * CAMERA_EDGE;
  const min = size * (1 - CAMERA_EDGE);
  if (s > max) return offset - (s - max);
  if (s < min) return offset + (min - s);
  return offset;
}
