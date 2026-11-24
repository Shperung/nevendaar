import { parseAsciiMap } from './GameMap';

const REPEAT = 20;

// Temporary hand-made pattern tiled REPEAT×REPEAT times, until maps come from Tiled (public/assets/maps).
const PATTERN = [
  '................',
  '................',
  '..#######...#...',
  '.....#......#...',
  '.....#......#...',
  '.....#..........',
  '..........####..',
  '...##...........',
  '...##...........',
  '.........#......',
  '.........#..##..',
  '..#####..#......',
  '.........#......',
  '................',
  '......####......',
  '................',
];

export const TEST_MAP = parseAsciiMap(
  Array.from({ length: REPEAT }, () => PATTERN.map((row) => row.repeat(REPEAT))).flat(),
);

export const TEST_MAP_SPAWN = {
  x: (REPEAT / 2) * PATTERN[0].length + 7.5,
  y: (REPEAT / 2) * PATTERN.length + 7.5,
};
