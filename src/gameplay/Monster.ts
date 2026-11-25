/**
 * Monster stats by unit name, defined in public/assets/data/monsters.json.
 * `speed` in tiles/s, `range` and `aggro` in tiles, `cooldown` in seconds between hits.
 */
export interface MonsterDef {
  hp: number;
  speed: number;
  damage: number;
  range: number;
  cooldown: number;
  aggro: number;
}

export const MONSTERS_URL = 'assets/data/monsters.json';
