import { describe, expect, it } from 'vitest';
import { createStorage } from '../../src/save/Storage';

function memoryBackend() {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('Storage', () => {
  it('saves and loads gold', async () => {
    const storage = createStorage(memoryBackend());
    await storage.saveGold(42);
    expect(await storage.loadGold()).toBe(42);
  });

  it('reads a missing or corrupt gold record as 0', async () => {
    const backend = memoryBackend();
    const storage = createStorage(backend);
    expect(await storage.loadGold()).toBe(0);
    for (const raw of ['abc', '-5', '1.5', '{', '"7"']) {
      backend.data.set('nevendaar.gold', raw);
      expect(await storage.loadGold()).toBe(0);
    }
  });

  it('round-trips arbitrary JSON values', async () => {
    const storage = createStorage(memoryBackend());
    await storage.save('k', { a: [1, 2] });
    expect(await storage.load('k')).toEqual({ a: [1, 2] });
    expect(await storage.load('missing')).toBeNull();
  });
});
