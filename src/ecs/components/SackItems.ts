import type { Item } from '../../gameplay/Items';

/**
 * Artifacts inside a loot entity on the ground (a GoldPile with items is drawn as a sack).
 * Variable-length data doesn't fit bitECS typed arrays, so it lives in a side map like Path.
 */
export const SackItems = new Map<number, Item[]>();
