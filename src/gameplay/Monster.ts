/**
 * Monster stats by unit name, defined in public/assets/data/monsters.json.
 * `speed` in tiles/s, `range` and `aggro` in tiles, `cooldown` in seconds between hits.
 * `level` sets the item level of its drops.
 */
export interface MonsterDef {
  level: number;
  hp: number;
  speed: number;
  damage: number;
  range: number;
  cooldown: number;
  aggro: number;
}

export const MONSTERS_URL = 'assets/data/monsters.json';
