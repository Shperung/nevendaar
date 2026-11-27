import { describe, expect, it } from 'vitest';
import DATA from '../../public/assets/data/inventory.json';
import { parseInventory } from '../../src/gameplay/Inventory';

const SLOT = { id: 'head', title: 'Шолом', accepts: ['helm'] };

describe('parseInventory', () => {
  it('reads the shipped inventory.json in order', () => {
    const inv = parseInventory(DATA);
    expect(inv.backpack).toEqual({ cols: 10, rows: 4 });
    expect(inv.slots.map((s) => s.id)).toEqual([
      'head',
      'amulet',
      'weapon',
      'offhand',
      'gloves',
      'belt',
      'ring1',
      'ring2',
      'body',
      'boots',
    ]);
    expect(inv.slots[2]).toEqual({
      id: 'weapon',
      title: 'Зброя',
      accepts: ['weapon1h', 'weapon2h'],
    });
  });

  it('throws on broken data with an inventory.json prefix', () => {
    const inv = (backpack: object, slots: unknown) => () => parseInventory({ backpack, slots });
    const ok = { cols: 10, rows: 4 };
    for (const bad of [
      inv({ cols: 1.5, rows: 4 }, [SLOT]),
      inv({ cols: 10, rows: 0 }, [SLOT]),
      inv({ cols: '10', rows: 4 }, [SLOT]),
      inv(ok, undefined),
      inv(ok, []),
      inv(ok, [SLOT, SLOT]),
      inv(ok, [{ ...SLOT, title: 5 }]),
      inv(ok, [{ ...SLOT, accepts: 'helm' }]),
      inv(ok, [{ ...SLOT, accepts: [1] }]),
      () => parseInventory({ slots: [SLOT] }),
    ]) {
      expect(bad).toThrow(/^inventory\.json: /);
    }
  });
});
