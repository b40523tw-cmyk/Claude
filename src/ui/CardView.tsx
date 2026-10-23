import { CARDS, RARITY_NAME, THEMES, TYPE_NAME, cardCost, cardText } from '../data/cards';
import type { CardInst } from '../engine/types';

interface Props {
  card: CardInst;
  cost?: number;
  size?: 'hand' | 'big';
  selected?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  style?: Record<string, string | number>;
  /** Show the upgraded version (shop preview). */
  previewUp?: boolean;
}

export function CardView({ card, cost, size = 'hand', selected, disabled, onClick, style, previewUp }: Props) {
  const d = CARDS[card.id];
  const up = previewUp || card.up;
  const base = cardCost(card.id, up);
  const shownCost = cost ?? base;
  const costCls = shownCost > base ? 'worse' : shownCost < base ? 'better' : '';
  return (
    <button
      type="button"
      class={`card ${size} r-${d.rarity} t-${d.theme} ${selected ? 'sel' : ''} ${disabled ? 'off' : ''}`}
      onClick={onClick}
      style={style}
      aria-label={`${d.name}，費用 ${shownCost}，${cardText(card.id, up, card.fused)}`}
    >
      <span class={`cost ${costCls}`}>{shownCost}</span>
      <span class="name">
        {d.name}
        {up && <span class="plus">+</span>}
        {card.fused && <span class="fused">融</span>}
      </span>
      <span class="art" aria-hidden="true">{THEMES[d.theme].icon}</span>
      <span class="type">{TYPE_NAME[d.type]}{size === 'big' && ` · ${RARITY_NAME[d.rarity]}`}</span>
      <span class="text">{cardText(card.id, up, card.fused)}</span>
    </button>
  );
}
