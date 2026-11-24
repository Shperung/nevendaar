/** Sprite variant for a blocked tile. */
export interface ObstacleVariant {
  texture: string;
  /** On-screen width in pixels (a tile is TILE_W wide). */
  width: number;
  /** Vertical anchor: the point of the sprite (0 = top, 1 = bottom) placed on the tile's ground spot. */
  anchorY: number;
}

/** Landscape theme of a map, defined in public/assets/data/biomes.json. */
export interface Biome {
  /** Seamless texture repeated over the whole floor; `tint` is any CSS color. */
  ground: { texture: string; tint: string };
  /** Named obstacle sets (e.g. rocks, forest); each connected obstacle group uses one set. */
  obstacles: Record<string, ObstacleVariant[]>;
}

export const BIOMES_URL = 'assets/data/biomes.json';

/** Texture paths in the biome are relative to public/assets/atlases. */
export function atlasPath(texture: string): string {
  return `assets/atlases/${texture}`;
}

export function biomeTextures(biome: Biome): string[] {
  const obstacles = Object.values(biome.obstacles).flat();
  return [biome.ground.texture, ...obstacles.map((o) => o.texture)].map(atlasPath);
}
