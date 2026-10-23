export type Theme = 'stock' | 'crypto' | 'deriv' | 'work' | 'safe' | 'neutral';
export type MajorTheme = Exclude<Theme, 'neutral'>;
export type Rarity = 'common' | 'uncommon' | 'epic' | 'legendary';
export type CardType = 'attack' | 'defense' | 'heal' | 'combo' | 'power';
export type Nums = Record<string, number>;

/** A card the player owns. */
export interface CardInst {
  uid: string;
  id: string;
  up: boolean;
  fused: boolean;
}

/** A card while it sits in hand: may carry a temporary cost change. */
export interface HandCard extends CardInst {
  costMod: number;
}

export type Intent =
  | { kind: 'attack'; dmg: number; buff?: number }
  | { kind: 'attackDebt'; dmg: number; debt: number }
  | { kind: 'attackHeal'; dmg: number; heal: number }
  | { kind: 'summon'; dmg?: number }
  | { kind: 'rest' };

export interface MonsterState {
  uid: string;
  id: string;
  hp: number;
  maxHp: number;
  block: number;
  /** Turns this monster has acted, starts at 0. */
  t: number;
  atk: number;
  intent: Intent;
  flags: Record<string, number>;
  dead: boolean;
}

export interface Statuses {
  exposure: number;
  bull: number;
  combo: number;
  interest: number;
  debt: number;
}

export interface Powers {
  dividend: number; // 存股: dmg per turn
  bullMarket: number; // 多頭市場
  fomo: number; // FOMO: 1 = active (3x crit)
  fomoTurns: number; // remaining self-damage turns
  frenzy: number; // 牛市狂熱: +crit per crit this turn
  leverage: number; // 槓桿倍數: +N to combo multipliers
  income: number; // 穩定收入: block per turn
  seniority: number; // 年資
  ironBowl: number; // 鐵飯碗: block lost per turn (0 = inactive)
  annuity: number; // 年金: interest per turn
  compound: number; // 複利
  lifeInsurance: number; // 壽險理賠: heal-to fraction (0 = none / used)
  liquidation: number; // 十倍槓桿 armed this turn: threshold
}

export interface TurnFlags {
  certBonus: number; // 專業證照
  coldWallet: number; // 冷錢包 pending block on next crit
  critBonus: number; // 牛市狂熱 accumulated this turn
  medInsurance: boolean;
  nextAttackCrit: number; // 挖礦: applies to next turn's first attack
  pendingNextAttackCrit: number;
  tookDamage: boolean;
  slash: number; // 斜槓人生: dmg per defense card this turn
}

export interface Fx {
  id: number;
  target: string; // 'player' or monster uid
  text: string;
  kind: 'dmg' | 'crit' | 'block' | 'heal' | 'info' | 'self';
}

export interface CombatState {
  kind: FightKind;
  monsters: MonsterState[];
  draw: CardInst[];
  hand: HandCard[];
  discard: CardInst[];
  exhaust: CardInst[];
  energy: number;
  turn: number;
  block: number;
  st: Statuses;
  pw: Powers;
  tf: TurnFlags;
  healed: number;
  firstAttackDone: boolean;
  lastTurnTookDamage: boolean;
  over: 'win' | 'lose' | null;
  log: string[];
}

export type FightKind = 'normal' | 'elite' | 'miniboss' | 'boss';
export type NodeKind = 'normal' | 'elite' | 'shop' | 'event';

export interface PathOption {
  kind: NodeKind | 'miniboss' | 'boss';
  hint: string;
}

export type Screen =
  | { name: 'paths'; options: PathOption[] }
  | { name: 'combat' }
  | { name: 'reward'; gold: number; cards: CardInst[]; picked: boolean; relicDrop: boolean }
  | { name: 'shop'; stock: { card: CardInst; price: number; sold: boolean }[]; then: 'fight' }
  | { name: 'event'; eventId: string; resolved: string | null }
  | { name: 'relic'; options: string[] }
  | { name: 'rest'; healed: number; upgraded: boolean }
  | { name: 'chapterClear' }
  | { name: 'gameOver' };

export interface RunState {
  version: 1;
  seed: number;
  rng: number;
  major: MajorTheme;
  difficulty: number;
  hp: number;
  maxHp: number;
  gold: number;
  deck: CardInst[];
  deckCap: number;
  relics: string[];
  chapter: number;
  stage: number; // 1..5
  fight: number; // 1..5, fights completed in this stage
  removes: number;
  combat: CombatState | null;
  screen: Screen;
  pendingFight: FightKind | null;
  lastMonster: string | null;
  usedOnce: Record<string, boolean>; // once-per-run relic triggers
  battles: number;
  relicGuarantee: boolean;
  stats: { kills: number; damage: number; cardsPlayed: number };
  nextUid: number;
  fx: Fx[];
  fxSeq: number;
  seen: string[]; // monsters seen this run, for the codex
}
