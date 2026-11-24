/** Landscape theme of a map, defined in public/assets/data/biomes.json. */
export interface Biome {
  /** Seamless texture repeated over the whole floor; `tint` is any CSS color. */
  ground: { texture: string; tint: string };
  /** Sprite variants for blocked tiles; `width` is the on-screen width in pixels (a tile is TILE_W wide). */
  obstacles: { texture: string; width: number }[];
}

export const BIOMES_URL = 'assets/data/biomes.json';

/** Texture paths in the biome are relative to public/assets/atlases. */
export function atlasPath(texture: string): string {
  return `assets/atlases/${texture}`;
}

export function biomeTextures(biome: Biome): string[] {
  return [biome.ground.texture, ...biome.obstacles.map((o) => o.texture)].map(atlasPath);
}
