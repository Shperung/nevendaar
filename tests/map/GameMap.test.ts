import { describe, expect, it } from 'vitest';
import { obstacleClusters, parseAsciiMap } from '../../src/map/GameMap';

describe('obstacleClusters', () => {
  it('groups edge-connected blocked tiles, not diagonal ones', () => {
    const map = parseAsciiMap(['##.', '.#.', '..#']);
    const c = obstacleClusters(map);
    expect([...c]).toEqual([0, 0, -1, -1, 0, -1, -1, -1, 8]);
  });
});
