import { CARDS, RARITY_NAME, THEMES, TYPE_NAME, cardCost, cardText } from '../data/cards';
import type { CardInst } from '../engine/types';

const frames = import.meta.glob('../assets/cards/frame-*.webp', { eager: true, import: 'default' }) as Record<string, string>;
const frameFor = (theme: string) => frames[`../assets/cards/frame-${theme}.webp`];

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
  const text = cardText(card.id, up, card.fused);
  const frame = frameFor(d.theme);
  return (
    <button
      type="button"
      class={`card ${size} r-${d.rarity} t-${d.theme} ${selected ? 'sel' : ''} ${disabled ? 'off' : ''} ${up ? 'is-up' : ''} ${card.fused ? 'is-fused' : ''}`}
      onClick={onClick}
      style={{ ...style, '--n': d.name.length + (up ? 1 : 0) + (card.fused ? 1 : 0), '--len': text.length, ...(frame ? { '--frame-img': `url(${frame})` } : {}) }}
      aria-label={`${d.name}，費用 ${shownCost}，${text}`}
    >
      <span class={`cost ${costCls}`}>{shownCost}</span>
      <span class="name">
        {d.name}
        {up && <span class="plus">+</span>}
        {card.fused && <span class="fused">融</span>}
      </span>
      <span class="art" aria-hidden="true">{THEMES[d.theme].icon}</span>
      <span class="type">{TYPE_NAME[d.type]}{size === 'big' && ` · ${RARITY_NAME[d.rarity]}`}</span>
      <span class="text">{text}</span>
    </button>
  );
}
