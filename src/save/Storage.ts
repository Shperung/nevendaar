import type { Item } from '../gameplay/Items';

/** Synchronous key-value backend; `localStorage` in the game, an in-memory map in tests. */
export interface StorageBackend {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const GOLD_KEY = 'nevendaar.gold';
const INVENTORY_KEY = 'nevendaar.inventory';

/**
 * The only access point to persistent storage. The API is async so the backend can move to
 * IndexedDB (AGENTS.md §2) without changing any caller.
 */
export function createStorage(backend: StorageBackend) {
  /** Parsed JSON under `key`, or null if missing or corrupt. */
  async function load(key: string): Promise<unknown> {
    const raw = backend.getItem(key);
    if (raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  async function save(key: string, value: unknown): Promise<void> {
    backend.setItem(key, JSON.stringify(value));
  }

  return {
    load,
    save,
    /** Saved wallet amount; anything but a non-negative whole number reads as 0. */
    async loadGold(): Promise<number> {
      const v = await load(GOLD_KEY);
      return typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 ? v : 0;
    },
    saveGold: (gold: number) => save(GOLD_KEY, gold),
    /** Saved artifact list as raw JSON entries (checked by restoreItems); not an array reads as []. */
    async loadInventory(): Promise<unknown[]> {
      const v = await load(INVENTORY_KEY);
      return Array.isArray(v) ? v : [];
    },
    saveInventory: (items: readonly Item[]) => save(INVENTORY_KEY, items),
  };
}

export type Storage = ReturnType<typeof createStorage>;
