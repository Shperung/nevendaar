import { Container, Graphics, Text } from 'pixi.js';

const MARGIN = 12;
const COIN_R = 12;

/** Top-left gold counter: placeholder coin + amount. */
export class Hud extends Container {
  private readonly amountText = new Text({
    text: '0',
    style: { fontSize: 22, fill: 0xf1c40f, stroke: { color: 0x000000, width: 4 } },
    anchor: { x: 0, y: 0.5 },
  });
  private gold = -1;

  constructor() {
    super();
    const coin = new Graphics()
      .circle(COIN_R, COIN_R, COIN_R)
      .fill(0xd4a017)
      .stroke({ color: 0x7a5a00, width: 2 });
    this.amountText.position.set(COIN_R * 2 + 8, COIN_R);
    this.addChild(coin, this.amountText);
    this.position.set(MARGIN, MARGIN);
  }

  /** Redraws the text only when the amount changed. */
  update(gold: number): void {
    if (gold === this.gold) return;
    this.gold = gold;
    this.amountText.text = String(gold);
  }
}
