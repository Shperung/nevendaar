import type { InventoryDef } from '../gameplay/Inventory';
import type { Item, ItemData } from '../gameplay/Items';
import { cardPosition, heroStatRows, inventoryScale, type HeroStats } from './InventoryLayout';
import { describeItem, RARITY_GLOW, RARITY_INK, type ItemCard } from './ItemText';
import './inventory.css';

/** Rows before this index go to the stats plaque, the rest (gold, depth) to the bottom one. */
const STATS_ROWS = 5;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  parent: HTMLElement,
  text = '',
): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  e.className = className;
  e.textContent = text;
  parent.appendChild(e);
  return e;
}

/**
 * Item icon over its type-letter placeholder: tries `card.icons` in order (unique, then base);
 * the placeholder stays visible until one loads.
 */
function itemIcon(card: ItemCard, className: string, parent: HTMLElement): void {
  const box = el('div', `inv-icon-box ${className}`, parent);
  el('span', 'inv-ph', box, card.letter);
  if (card.icons.length === 0) return;
  const img = el('img', 'inv-icon', box);
  img.alt = '';
  let next = 0;
  const tryNext = () => {
    if (next >= card.icons.length) return img.remove();
    img.src = `/assets/ui/items/${card.icons[next++]}.png`;
  };
  img.onload = () => box.classList.add('has-icon');
  img.onerror = tryNext;
  tryNext();
}

function cssColor(n: number): string {
  return `#${n.toString(16).padStart(6, '0')}`;
}

/**
 * Modal inventory window on a native <dialog>: hero stats, empty equipment slots over the hero
 * painting and the backpack grid of artifacts with a parchment card on hover.
 * The game keeps running underneath; the dialog only blocks input.
 */
export class InventoryWindow {
  /** Called on open and on every close (× button, `I`, native `Esc`). */
  onChange: (open: boolean) => void = () => undefined;

  private readonly dialog = document.createElement('dialog');
  private readonly name: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly extra: HTMLElement;
  private readonly closeButton: HTMLButtonElement;
  private readonly values: HTMLElement[] = [];
  private shown: string[] = [];
  private readonly pack: HTMLElement;
  private readonly card: HTMLElement;
  private readonly def: InventoryDef;
  private items: readonly Item[] = [];
  private data: ItemData | null = null;

  constructor(def: InventoryDef) {
    this.def = def;
    const d = this.dialog;
    d.className = 'inv';
    d.setAttribute('aria-label', 'Інвентар');

    const hero = el('aside', 'inv-hero', d);
    this.name = el('h2', 'inv-plaque inv-name', hero);
    this.stats = el('dl', 'inv-plaque inv-stats', hero);
    this.extra = el('dl', 'inv-plaque inv-extra', hero);

    const doll = el('section', 'inv-doll', d);
    for (const s of def.slots) {
      const slot = el('div', `inv-slot inv-slot--${s.id}`, doll);
      slot.dataset.title = s.title;
    }

    this.pack = el('section', 'inv-pack', d);
    this.pack.style.setProperty('--cols', String(def.backpack.cols));
    this.setItems([], null);
    this.pack.addEventListener('pointerover', (e) => this.hover(e));
    this.pack.addEventListener('pointermove', (e) => this.placeCard(e));
    this.pack.addEventListener('pointerleave', () => this.card.classList.remove('is-shown'));
    this.card = el('div', 'inv-card', d);

    this.closeButton = el('button', 'inv-close', d, '×');
    this.closeButton.type = 'button';
    this.closeButton.setAttribute('aria-label', 'Закрити');
    this.closeButton.addEventListener('click', () => this.close());

    d.addEventListener('close', () => {
      this.card.classList.remove('is-shown');
      this.onChange(false);
    });
    document.body.appendChild(d);
    this.resize();
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  open(stats: HeroStats): void {
    this.update(stats);
    this.dialog.showModal();
    this.closeButton.focus();
    this.onChange(true);
  }

  close(): void {
    this.dialog.close();
  }

  /** Rewrites only the texts that changed (called every frame while open). */
  update(s: HeroStats): void {
    if (this.name.textContent !== s.name) this.name.textContent = s.name;
    heroStatRows(s).forEach(([label, value], i) => {
      if (!this.values[i]) {
        const list = i < STATS_ROWS ? this.stats : this.extra;
        el('dt', '', list, label);
        this.values[i] = el('dd', '', list);
      }
      if (this.shown[i] !== value) {
        this.shown[i] = value;
        this.values[i].textContent = value;
      }
    });
  }

  /**
   * Rebuilds the backpack cells: artifacts in list order, at least cols × rows cells and then whole
   * rows (called only when the list changes).
   */
  setItems(items: readonly Item[], data: ItemData | null): void {
    this.items = items;
    this.data = data;
    const { cols, rows } = this.def.backpack;
    const count = Math.max(cols * rows, Math.ceil(items.length / cols) * cols);
    this.pack.replaceChildren();
    for (let i = 0; i < count; i++) {
      const cell = el('div', 'inv-cell', this.pack);
      const item = items[i];
      if (!item || !data) continue;
      cell.dataset.index = String(i);
      cell.dataset.rarity = item.rarity;
      cell.style.setProperty('--rarity', cssColor(RARITY_GLOW[item.rarity]));
      itemIcon(describeItem(data, item), 'inv-cell-icon', cell);
    }
  }

  /** Fills the card for the artifact under the pointer (event delegation on the backpack). */
  private hover(e: PointerEvent): void {
    const cell = (e.target as Element).closest<HTMLElement>('.inv-cell[data-index]');
    const item = cell ? this.items[Number(cell.dataset.index)] : undefined;
    if (!item || !this.data) {
      this.card.classList.remove('is-shown');
      return;
    }
    const c = describeItem(this.data, item);
    const card = this.card;
    card.replaceChildren();
    card.style.setProperty('--rarity-ink', RARITY_INK[c.rarity]);
    itemIcon(c, 'inv-card-icon', card);
    el('h3', 'inv-card-name', card, c.name);
    if (c.baseName) el('p', 'inv-card-base', card, c.baseName);
    el('p', 'inv-card-sub', card, c.subtitle);
    el('p', 'inv-card-type', card, c.typeLine);
    if (c.baseLine) el('p', 'inv-card-type', card, c.baseLine);
    if (c.affixLines.length > 0) {
      el('div', 'inv-card-divider', card);
      const list = el('ul', 'inv-card-affixes', card);
      for (const line of c.affixLines) el('li', '', list, line);
    }
    if (c.flavor) el('p', 'inv-card-flavor', card, c.flavor);
    card.classList.add('is-shown');
    this.placeCard(e);
  }

  /**
   * The card lives inside the scaled dialog (its containing block), so the screen position from
   * cardPosition is mapped back to dialog pixels: (screen − dialog rect) / scale.
   */
  private placeCard(e: PointerEvent): void {
    if (!this.card.classList.contains('is-shown')) return;
    const rect = this.dialog.getBoundingClientRect();
    const scale = rect.width / this.dialog.offsetWidth;
    const p = cardPosition(
      { x: e.clientX, y: e.clientY },
      { w: this.card.offsetWidth * scale, h: this.card.offsetHeight * scale },
      { w: innerWidth, h: innerHeight },
    );
    this.card.style.left = `${(p.x - rect.left) / scale}px`;
    this.card.style.top = `${(p.y - rect.top) / scale}px`;
  }

  resize(): void {
    this.dialog.style.setProperty('--scale', String(inventoryScale(innerWidth, innerHeight)));
  }
}
