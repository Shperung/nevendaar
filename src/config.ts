export const TILE_W = 128;
export const TILE_H = 64;
export const FIXED_DT = 1 / 60;

export const BG_COLOR = 0x15171c;
/** Hero speed in tiles per second. */
export const HERO_SPEED = 4;
/** Hero melee: damage per hit, reach in tiles, seconds between hits. */
export const HERO_ATTACK = { damage: 10, range: 1.2, cooldown: 0.5 };
export const HERO_HP = 100;
/** Hero name and dungeon depth shown by the HUD and the inventory window (no dungeon yet). */
export const HERO_NAME = 'Вотан';
export const DEPTH = 1;
/** Monsters stop chasing once the hero is this many times their aggro range away. */
export const MONSTER_LEASH_FACTOR = 2;
/** On-screen unit height in pixels; also the click hit box height (width is half of it). */
export const UNIT_HEIGHT = 110;
/** While the button is held, re-path toward the cursor this often (seconds). */
export const HOLD_REPATH_INTERVAL = 0.1;
/** Camera scrolls once the hero passes this fraction of the screen (and 1 - this on the opposite side). */
export const CAMERA_EDGE = 0.7;
/** Monster packs on the test map. Spacing must stay > 2 × radius so packs never overlap (tiles). */
export const MONSTER_PACKS = {
  count: 600,
  minSize: 3,
  maxSize: 7,
  radius: 2.5,
  spacing: 6,
};
/** Minimum distance of any monster from the hero spawn (tiles). */
export const MONSTER_SPAWN_CLEARANCE = 5;
/** Max offset of a gold pile from the monster's death spot (tiles). */
export const GOLD_SCATTER = 0.3;
/** Gold amount multiplier of the current zone; later the dungeon level. */
export const ZONE_GOLD_MULT = 1;
/** Pile size thresholds (visual only): amount ≤ [0] small, ≤ [1] medium, else large. */
export const GOLD_PILE_TIERS = [5, 15];
/** Click/hover hit radius around a gold pile in screen pixels (vertical half as tall, iso-squashed). */
export const GOLD_PILE_PICK = 24;
/** Right side panel design size in pixels; it scales with the window height within PANEL_SCALE. */
export const PANEL_W = 200;
export const PANEL_H = 800;
export const PANEL_SCALE = [0.7, 1.4] as const;
/** Min fraction of the window width left to the game when the window is narrow. */
export const PANEL_MIN_VIEW = 0.6;
/** Minimap window in panel design pixels; tileScale shrinks toScreen so a tile is a 4 × 2 diamond. */
export const MINIMAP = { w: 160, h: 120, tileScale: 1 / 32 };
/** Panel art in public/assets/ui/ is painted at 2× the design pixels. */
export const UI_ART_SCALE = 0.5;
