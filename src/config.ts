export const TILE_W = 128;
export const TILE_H = 64;
export const FIXED_DT = 1 / 60;

export const BG_COLOR = 0x15171c;
/** Hero speed in tiles per second. */
export const HERO_SPEED = 4;
/** Hero melee: damage per hit, reach in tiles, seconds between hits. */
export const HERO_ATTACK = { damage: 10, range: 1.2, cooldown: 0.5 };
/** On-screen unit height in pixels; also the click hit box height (width is half of it). */
export const UNIT_HEIGHT = 110;
/** While the button is held, re-path toward the cursor this often (seconds). */
export const HOLD_REPATH_INTERVAL = 0.1;
/** Camera scrolls once the hero passes this fraction of the screen (and 1 - this on the opposite side). */
export const CAMERA_EDGE = 0.7;
/** Monster packs on the test map. Spacing must stay > 2 × radius so packs never overlap (tiles). */
export const MONSTER_PACKS = {
  count: 300,
  minSize: 3,
  maxSize: 7,
  radius: 2.5,
  spacing: 7,
};
/** Minimum distance of any monster from the hero spawn (tiles). */
export const MONSTER_SPAWN_CLEARANCE = 5;
