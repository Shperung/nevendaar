/** Equipment slot: `accepts` lists item types it will take (unused until items exist). */
export interface SlotDef {
  id: string;
  title: string;
  accepts: string[];
}

export interface InventoryDef {
  backpack: { cols: number; rows: number };
  slots: SlotDef[];
}

export const INVENTORY_URL = 'assets/data/inventory.json';

function fail(msg: string): never {
  throw new Error(`inventory.json: ${msg}`);
}

function obj(value: unknown, path: string): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    fail(`${path} must be an object`);
  }
  return value as Record<string, unknown>;
}

function size(value: unknown, path: string): number {
  if (!Number.isInteger(value) || (value as number) < 1) {
    fail(`invalid ${path}: ${JSON.stringify(value)}`);
  }
  return value as number;
}

/** Validates inventory.json: backpack grid size and the equipment slots in display order. */
export function parseInventory(json: unknown): InventoryDef {
  const root = obj(json, 'root');
  const b = obj(root.backpack, 'backpack');
  const backpack = { cols: size(b.cols, 'backpack.cols'), rows: size(b.rows, 'backpack.rows') };
  if (!Array.isArray(root.slots) || root.slots.length === 0) {
    fail('slots must be a non-empty array');
  }
  const ids = new Set<string>();
  const slots = root.slots.map((entry, i): SlotDef => {
    const s = obj(entry, `slots[${i}]`);
    if (typeof s.id !== 'string' || s.id === '') fail(`slots[${i}].id must be a string`);
    if (ids.has(s.id)) fail(`duplicate slot id "${s.id}"`);
    ids.add(s.id);
    if (typeof s.title !== 'string') fail(`slots[${i}].title must be a string`);
    if (!Array.isArray(s.accepts) || !s.accepts.every((a) => typeof a === 'string')) {
      fail(`slots[${i}].accepts must be an array of strings`);
    }
    return { id: s.id, title: s.title, accepts: s.accepts as string[] };
  });
  return { backpack, slots };
}
