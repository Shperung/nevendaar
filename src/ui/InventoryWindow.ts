import type { InventoryDef } from '../gameplay/Inventory';
import { heroStatRows, inventoryScale, type HeroStats } from './InventoryLayout';
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
 * Modal inventory window on a native <dialog>: hero stats, empty equipment slots over the hero
 * painting and the backpack grid. The game keeps running underneath; the dialog only blocks input.
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

  constructor(def: InventoryDef) {
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

    const pack = el('section', 'inv-pack', d);
    const { cols, rows } = def.backpack;
    pack.style.setProperty('--cols', String(cols));
    pack.style.setProperty('--rows', String(rows));
    for (let i = 0; i < cols * rows; i++) el('div', 'inv-cell', pack);

    this.closeButton = el('button', 'inv-close', d, '×');
    this.closeButton.type = 'button';
    this.closeButton.setAttribute('aria-label', 'Закрити');
    this.closeButton.addEventListener('click', () => this.close());

    d.addEventListener('close', () => this.onChange(false));
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

  resize(): void {
    this.dialog.style.setProperty('--scale', String(inventoryScale(innerWidth, innerHeight)));
  }
}
