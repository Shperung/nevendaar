import type { Application, Container } from 'pixi.js';
import { CAMERA_EDGE } from '../config';

type Point = { x: number; y: number };

/** Dead-zone camera: moves `layer` only when the target leaves the central part of the screen. */
export class Camera {
  constructor(
    private readonly app: Application,
    private readonly layer: Container,
  ) {}

  /** `p` is in layer-local (world screen) pixels. */
  centerOn(p: Point): void {
    const { width, height } = this.app.screen;
    this.layer.position.set(width / 2 - p.x, height / 2 - p.y);
  }

  follow(p: Point): void {
    const { width, height } = this.app.screen;
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
