import type { Item } from '../../gameplay/Items';

/** The hero's artifacts in pickup order (new ones go to the end); a side map like Path. */
export const Backpack = new Map<number, Item[]>();
