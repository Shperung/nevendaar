import { TILE_H, TILE_W } from '../config';

// 2:1 diamond projection: moving +1 tile in x goes right-down, +1 in y goes left-down.
export function toScreen(tx: number, ty: number): { x: number; y: number } {
  return {
    x: (tx - ty) * (TILE_W / 2),
    y: (tx + ty) * (TILE_H / 2),
  };
}

// Inverse of toScreen: solve the 2x2 system for tx, ty.
export function toTile(sx: number, sy: number): { x: number; y: number } {
  const a = sx / (TILE_W / 2);
  const b = sy / (TILE_H / 2);
  return { x: (a + b) / 2, y: (b - a) / 2 };
}
