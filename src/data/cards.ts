import type { CardType, CombatState, MonsterState, Nums, Powers, Rarity, Statuses, Theme, TurnFlags } from '../engine/types';

export interface PlayCtx {
  c: CombatState;
  st: Statuses;
  pw: Powers;
  tf: TurnFlags;
  target: MonsterState | null;
  /** True once any hit of this card has crit. */
  critted: boolean;
  /** One hit on the chosen target. `crit` is the card's own crit chance. */
  hit(dmg: number, crit?: number): void;
  /** One hit on every living monster. */
  aoe(dmg: number, crit?: number): void;
  /** One hit on a random living monster (no bull bonus). */
  randomHit(dmg: number): void;
  block(n: number): void;
  heal(n: number): void;
  /** Self-inflicted savings loss; ignores shield and exposure. */
  lose(n: number): void;
  /** Current savings. */
  hp(): number;
  draw(n: number): void;
  gainEnergy(n: number): void;
  /** Combo multiplier N (槓桿倍數 no longer changes it). */
  N(n: number): number;
  clearOneDebuff(): void;
}

export interface CardDef {
  id: string;
  name: string;
  theme: Theme;
  rarity: Rarity;
  type: CardType;
  cost: [number, number];
  start: boolean; // unlocked on first play
  base: Nums;
  up: Nums;
  /** Extra combo a combo-type card adds on top of the +1 every card gives (default 1). */
  combo?: number;
  target?: boolean;
  desc(n: Nums): string;
  play(x: PlayCtx, n: Nums): void;
}

/** Number keys multiplied by fusion. Everything else (hits, crit, combo N) stays. */
export const FUSE_KEYS = ['dmg', 'block', 'heal', 'block2', 'dmg2'];

const pct = (p: number) => `${Math.round(p * 100)}%`;

const defs: CardDef[] = [
  // ───────── 中性起始卡 ─────────
  {
    id: 'parttime', name: '打工賺錢', theme: 'neutral', rarity: 'common', type: 'attack', cost: [1, 1], start: true,
    base: { dmg: 6 }, up: { dmg: 9 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害`,
    play: (x, n) => x.hit(n.dmg),
  },
  {
    id: 'emergency', name: '緊急預備金', theme: 'neutral', rarity: 'common', type: 'defense', cost: [1, 1], start: true,
    base: { block: 5 }, up: { block: 8 },
    desc: (n) => `獲得 ${n.block} 護盾`,
    play: (x, n) => x.block(n.block),
  },
  {
    id: 'ledger', name: '記帳', theme: 'neutral', rarity: 'common', type: 'heal', cost: [1, 1], start: true,
    base: { heal: 3, draw: 1 }, up: { heal: 5, draw: 1 },
    desc: (n) => `回復 ${n.heal} 存款，抽 ${n.draw} 張`,
    play: (x, n) => { x.heal(n.heal); x.draw(n.draw); },
  },

  // ───────── 股票 ─────────
  {
    id: 'daytrade', name: '當沖', theme: 'stock', rarity: 'common', type: 'attack', cost: [1, 1], start: true,
    base: { dmg: 9 }, up: { dmg: 13 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害，獲得 1 曝險`,
    play: (x, n) => { x.hit(n.dmg); x.st.exposure += 1; },
  },
  {
    id: 'chase', name: '追高', theme: 'stock', rarity: 'common', type: 'attack', cost: [1, 1], start: true,
    base: { dmg: 5 }, up: { dmg: 8 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害，獲得 1 多頭`,
    play: (x, n) => { x.hit(n.dmg); x.st.bull += 1; },
  },
  {
    id: 'etf', name: 'ＥＴＦ', theme: 'stock', rarity: 'common', type: 'defense', cost: [0, 0], start: true,
    base: { block: 5 }, up: { block: 8 },
    desc: (n) => `獲得 ${n.block} 護盾、1 多頭`,
    play: (x, n) => { x.block(n.block); x.st.bull += 1; },
  },
  {
    id: 'takeprofit', name: '停利', theme: 'stock', rarity: 'common', type: 'heal', cost: [1, 1], start: true,
    base: { heal: 3, rm: 1 }, up: { heal: 5, rm: 2 },
    desc: (n) => `回復 ${n.heal} 存款，移除 ${n.rm} 曝險`,
    play: (x, n) => { x.heal(n.heal); x.st.exposure = Math.max(0, x.st.exposure - n.rm); },
  },
  {
    id: 'margin', name: '融資買進', theme: 'stock', rarity: 'uncommon', type: 'combo', cost: [0, 0], start: true,
    base: { bull: 2 }, up: { bull: 3 },
    desc: (n) => `獲得 ${n.bull} 多頭、2 曝險`,
    play: (x, n) => { x.st.bull += n.bull; x.st.exposure += 2; },
  },
  {
    id: 'tsmc', name: '台積電跳空', theme: 'stock', rarity: 'uncommon', type: 'attack', cost: [3, 3], start: true,
    base: { dmg: 23 }, up: { dmg: 28 }, target: true,
    // Easter egg: 2330 is TSMC's ticker, so the base card reads 23.30 (it deals 23).
    desc: (n) => `造成 ${n.dmg === 23 ? '23.30' : n.dmg} 傷害，獲得 2 曝險`,
    play: (x, n) => { x.hit(n.dmg); x.st.exposure += 2; },
  },
  {
    id: 'dividend', name: '存股 0050', theme: 'stock', rarity: 'uncommon', type: 'power', cost: [2, 1], start: false,
    base: { dmg: 5 }, up: { dmg: 5 },
    desc: (n) => `每回合開始對隨機怪物造成 ${n.dmg} 傷害`,
    play: (x, n) => { x.pw.dividend += n.dmg; },
  },
  {
    id: 'bullmarket', name: '多頭市場', theme: 'stock', rarity: 'epic', type: 'power', cost: [0, 0], start: false,
    base: { n: 1 }, up: { n: 2 },
    desc: (n) => `每打出一張攻擊牌，獲得 ${n.n} 多頭`,
    play: (x, n) => { x.pw.bullMarket += n.n; },
  },
  {
    id: 'earnings', name: '財報驚喜', theme: 'stock', rarity: 'epic', type: 'attack', cost: [2, 2], start: false,
    base: { dmg: 12, per: 6 }, up: { dmg: 16, per: 8 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害，每層多頭改為 +${n.per}，消耗全部多頭`,
    // bull handled specially in combat (per-layer override)
    play: (x, n) => x.hit(n.dmg),
  },
  {
    id: 'allin', name: 'All-in', theme: 'stock', rarity: 'legendary', type: 'attack', cost: [3, 3], start: false,
    base: { dmg: 50 }, up: { dmg: 65 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害；消耗 50% 存款，獲得 3 曝險`,
    play: (x, n) => { x.hit(n.dmg); x.lose(Math.floor(x.hp() / 2)); x.st.exposure += 3; },
  },

  // ───────── 虛擬貨幣 ─────────
  {
    id: 'btfd', name: '抄底比特幣', theme: 'crypto', rarity: 'common', type: 'attack', cost: [1, 1], start: true,
    base: { dmg: 7, crit: 0.4, lose: 1 }, up: { dmg: 10, crit: 0.5, lose: 1 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害，爆擊率 ${pct(n.crit)}；失去 ${n.lose} 存款`,
    play: (x, n) => { x.hit(n.dmg, n.crit); x.lose(n.lose); },
  },
  {
    id: 'airdrop', name: '空投', theme: 'crypto', rarity: 'common', type: 'attack', cost: [0, 0], start: true,
    base: { dmg: 4, crit: 0.6, lose: 1 }, up: { dmg: 6, crit: 0.6, lose: 1 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害，爆擊率 ${pct(n.crit)}；失去 ${n.lose} 存款`,
    play: (x, n) => { x.hit(n.dmg, n.crit); x.lose(n.lose); },
  },
  {
    id: 'doge', name: '狗狗幣', theme: 'crypto', rarity: 'common', type: 'attack', cost: [1, 1], start: true,
    base: { dmg: 3, hits: 2, crit: 0.4, lose: 2 }, up: { dmg: 3, hits: 3, crit: 0.4, lose: 2 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害 ${n.hits} 次，每次爆擊率 ${pct(n.crit)}；失去 ${n.lose} 存款`,
    play: (x, n) => { for (let i = 0; i < n.hits; i++) x.hit(n.dmg, n.crit); x.lose(n.lose); },
  },
  {
    id: 'coldwallet', name: '冷錢包', theme: 'crypto', rarity: 'common', type: 'defense', cost: [1, 1], start: true,
    base: { block: 6, block2: 6 }, up: { block: 9, block2: 9 },
    desc: (n) => `獲得 ${n.block} 護盾；本回合下次爆擊時再獲得 ${n.block2} 護盾`,
    play: (x, n) => { x.block(n.block); x.tf.coldWallet += n.block2; },
  },
  {
    id: 'mining', name: '挖礦', theme: 'crypto', rarity: 'uncommon', type: 'heal', cost: [1, 1], start: true,
    base: { heal: 6, crit: 0.3 }, up: { heal: 8, crit: 0.5 },
    desc: (n) => `回復 ${n.heal} 存款；下回合第一張攻擊牌爆擊率 +${pct(n.crit)}`,
    play: (x, n) => { x.heal(n.heal); x.tf.pendingNextAttackCrit += n.crit; },
  },
  {
    id: 'pump', name: '拉盤', theme: 'crypto', rarity: 'uncommon', type: 'attack', cost: [2, 2], start: true,
    base: { dmg: 15, crit: 0.5, lose: 4 }, up: { dmg: 20, crit: 0.5, lose: 4 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害，爆擊率 ${pct(n.crit)}；失去 ${n.lose} 存款`,
    play: (x, n) => { x.hit(n.dmg, n.crit); x.lose(n.lose); },
  },
  {
    id: 'x100', name: '100 倍合約', theme: 'crypto', rarity: 'uncommon', type: 'combo', cost: [1, 1], start: false,
    base: { dmg: 3, hits: 3, crit: 0.3, lose: 3 }, up: { dmg: 3, hits: 4, crit: 0.3, lose: 3 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害 ${n.hits} 次，每次爆擊率 ${pct(n.crit)}；失去 ${n.lose} 存款`,
    play: (x, n) => { for (let i = 0; i < n.hits; i++) x.hit(n.dmg, n.crit); x.lose(n.lose); },
  },
  {
    id: 'fomo', name: 'FOMO', theme: 'crypto', rarity: 'epic', type: 'power', cost: [1, 1], start: false,
    base: { turns: 3 }, up: { turns: 4 },
    desc: (n) => `爆擊傷害變 3 倍；每回合開始失去 3 存款，持續 ${n.turns} 回合`,
    play: (x, n) => { x.pw.fomo = 1; x.pw.fomoTurns += n.turns; },
  },
  {
    id: 'frenzy', name: '牛市狂熱', theme: 'crypto', rarity: 'epic', type: 'power', cost: [1, 0], start: false,
    base: {}, up: {},
    desc: () => `每次爆擊後，本回合爆擊率 +10%（可疊加）`,
    play: (x) => { x.pw.frenzy += 0.1; },
  },
  {
    id: 'halving', name: '比特幣減半', theme: 'crypto', rarity: 'legendary', type: 'attack', cost: [3, 3], start: false,
    base: { dmg: 30, crit: 0.5 }, up: { dmg: 30, crit: 0.65 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害，爆擊率 ${pct(n.crit)}；爆擊回復 10 存款，沒爆擊失去 10 存款`,
    play: (x, n) => { x.hit(n.dmg, n.crit); if (x.critted) x.heal(10); else x.lose(10); },
  },

  // ───────── 衍生性商品 ─────────
  {
    id: 'minitx', name: '小台當沖', theme: 'deriv', rarity: 'common', type: 'combo', cost: [0, 0], start: true,
    base: { dmg: 2, n: 2 }, up: { dmg: 2, n: 3 }, target: true,
    desc: (n) => `造成 ${n.dmg} + 連擊×${n.n} 傷害`,
    play: (x, n) => x.hit(n.dmg + x.st.combo * x.N(n.n)),
  },
  {
    id: 'microtx', name: '微台指', theme: 'deriv', rarity: 'common', type: 'combo', cost: [0, 0], start: true,
    base: { dmg: 1, n: 1, draw: 1 }, up: { dmg: 1, n: 1, draw: 2 }, target: true,
    desc: (n) => `造成 ${n.dmg} + 連擊×${n.n} 傷害，抽 ${n.draw} 張`,
    play: (x, n) => { x.hit(n.dmg + x.st.combo * x.N(n.n)); x.draw(n.draw); },
  },
  {
    id: 'spread', name: '價差交易', theme: 'deriv', rarity: 'common', type: 'combo', cost: [1, 1], start: true,
    base: { dmg: 3 }, up: { dmg: 4 }, combo: 2, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害 2 次，額外連擊 +2`,
    play: (x, n) => { x.hit(n.dmg); x.hit(n.dmg); },
  },
  {
    id: 'collateral', name: '保證金', theme: 'deriv', rarity: 'common', type: 'defense', cost: [1, 1], start: true,
    base: { block: 5, n: 1 }, up: { block: 8, n: 1 },
    desc: (n) => `獲得 ${n.block} 護盾、1 資金，每 1 連擊再 +${n.n} 護盾`,
    play: (x, n) => { x.block(n.block + x.st.combo * x.N(n.n)); x.gainEnergy(1); },
  },
  {
    id: 'optseller', name: '選擇權賣方', theme: 'deriv', rarity: 'uncommon', type: 'combo', cost: [1, 1], start: true,
    base: { block: 4 }, up: { block: 7 }, combo: 2,
    desc: (n) => `獲得 ${n.block} 護盾，額外連擊 +2`,
    play: (x, n) => x.block(n.block),
  },
  {
    id: 'straddle', name: '跨式策略', theme: 'deriv', rarity: 'uncommon', type: 'attack', cost: [1, 1], start: true,
    base: { n: 2 }, up: { n: 3 },
    desc: (n) => `對所有怪物造成 連擊×${n.n} 傷害，抽 1 張`,
    play: (x, n) => { x.aoe(x.st.combo * x.N(n.n)); x.draw(1); },
  },
  {
    id: 'cycle', name: '當沖循環', theme: 'deriv', rarity: 'uncommon', type: 'combo', cost: [2, 2], start: false,
    base: { draw: 2, th: 5 }, up: { draw: 2, th: 4 },
    desc: (n) => `抽 ${n.draw} 張；連擊達 ${n.th} 以上時獲得 1 資金`,
    // energy check happens after combo increments; see combat.afterPlay
    play: (x, n) => x.draw(n.draw),
  },
  {
    id: 'leverage', name: '槓桿倍數', theme: 'deriv', rarity: 'epic', type: 'power', cost: [1, 0], start: false,
    base: {}, up: {},
    // Only cards that already deal damage get the +1 (handled in the play context's hit helpers).
    desc: () => `後續卡牌的傷害都 +1`,
    play: (x) => { x.pw.leverage += 1; },
  },
  {
    id: 'settle', name: '期貨結算日', theme: 'deriv', rarity: 'epic', type: 'attack', cost: [2, 2], start: false,
    base: { n: 5 }, up: { n: 6 }, target: true,
    desc: (n) => `造成 連擊×${n.n} 傷害，連擊歸零，抽 1 張`,
    play: (x, n) => { x.hit(x.st.combo * x.N(n.n)); x.st.combo = 0; x.draw(1); },
  },
  {
    id: 'x10', name: '十倍槓桿', theme: 'deriv', rarity: 'legendary', type: 'combo', cost: [1, 0], start: false,
    base: { th: 10 }, up: { th: 15 }, combo: 0,
    desc: (n) => `連擊翻倍；本回合連擊超過 ${n.th}，回合結束失去 10 存款（斷頭）`,
    play: (x, n) => {
      x.st.combo *= 2;
      x.pw.liquidation = x.pw.liquidation ? Math.min(x.pw.liquidation, n.th) : n.th;
    },
  },

  // ───────── 腳踏實地 ─────────
  {
    id: 'overtime', name: '加班', theme: 'work', rarity: 'common', type: 'defense', cost: [1, 1], start: true,
    base: { block: 8 }, up: { block: 11 },
    desc: (n) => `獲得 ${n.block} 護盾`,
    play: (x, n) => x.block(n.block),
  },
  {
    id: 'clockin', name: '打卡上班', theme: 'work', rarity: 'common', type: 'defense', cost: [1, 1], start: true,
    base: { block: 4 }, up: { block: 7 },
    desc: (n) => `獲得 ${n.block} 護盾，抽 1 張`,
    play: (x, n) => { x.block(n.block); x.draw(1); },
  },
  {
    id: 'quota', name: '業績達標', theme: 'work', rarity: 'common', type: 'attack', cost: [1, 1], start: true,
    base: { dmg: 6, dmg2: 4 }, up: { dmg: 8, dmg2: 6 }, target: true,
    desc: (n) => `造成 ${n.dmg} 傷害；若有護盾，再 +${n.dmg2}`,
    play: (x, n) => x.hit(n.dmg + (x.c.block > 0 ? n.dmg2 : 0)),
  },
  {
    id: 'nap', name: '午休', theme: 'work', rarity: 'common', type: 'heal', cost: [1, 1], start: true,
    base: { heal: 3, block: 3 }, up: { heal: 6, block: 5 },
    desc: (n) => `回復 ${n.heal} 存款，獲得 ${n.block} 護盾`,
    play: (x, n) => { x.heal(n.heal); x.block(n.block); },
  },
  {
    id: 'bonus', name: '年終獎金', theme: 'work', rarity: 'uncommon', type: 'attack', cost: [1, 0], start: true,
    base: {}, up: {}, target: true,
    desc: () => `造成等同目前護盾值的傷害`,
    play: (x) => x.hit(x.c.block),
  },
  {
    id: 'license', name: '專業證照', theme: 'work', rarity: 'uncommon', type: 'defense', cost: [0, 0], start: true,
    base: { block: 3, per: 3 }, up: { block: 5, per: 4 },
    desc: (n) => `獲得 ${n.block} 護盾；本回合之後每張防禦牌再 +${n.per} 護盾`,
    play: (x, n) => { x.block(n.block); x.tf.certBonus += n.per; },
  },
  {
    id: 'income', name: '穩定收入', theme: 'work', rarity: 'uncommon', type: 'power', cost: [2, 2], start: false,
    base: { block: 4 }, up: { block: 6 },
    desc: (n) => `每回合開始獲得 ${n.block} 護盾`,
    play: (x, n) => { x.pw.income += n.block; },
  },
  {
    id: 'seniority', name: '年資', theme: 'work', rarity: 'epic', type: 'power', cost: [2, 1], start: false,
    base: {}, up: {},
    desc: () => `每回合開始，護盾 ×2`,
    play: (x) => { x.pw.seniority += 1; },
  },
  {
    id: 'slash', name: '斜槓人生', theme: 'work', rarity: 'epic', type: 'combo', cost: [0, 0], start: false,
    base: { dmg: 3 }, up: { dmg: 5 },
    desc: (n) => `本回合每打一張防禦牌，連擊 +1 並對隨機怪物造成 ${n.dmg} 傷害`,
    play: (x, n) => { x.tf.slash += n.dmg; },
  },
  {
    id: 'ironbowl', name: '鐵飯碗', theme: 'work', rarity: 'legendary', type: 'power', cost: [3, 3], start: false,
    base: { block: 5, heal: 3 }, up: { block: 8, heal: 5 },
    desc: (n) => `每回合開始獲得 ${n.block} 護盾，回復 ${n.heal} 存款`,
    play: (x, n) => { x.pw.ironBowl += n.block; x.pw.ironBowlHeal = (x.pw.ironBowlHeal ?? 0) + n.heal; },
  },

  // ───────── 保守型 ─────────
  {
    id: 'deposit', name: '定存', theme: 'safe', rarity: 'common', type: 'heal', cost: [0, 0], start: true,
    base: { int: 3 }, up: { int: 4 },
    desc: (n) => `獲得 ${n.int} 利息`,
    play: (x, n) => { x.st.interest += n.int; },
  },
  {
    id: 'savingsins', name: '儲蓄險', theme: 'safe', rarity: 'common', type: 'heal', cost: [1, 1], start: true,
    base: { heal: 6 }, up: { heal: 9 }, target: true,
    desc: (n) => `回復 ${n.heal} 存款，造成 2 傷害`,
    play: (x, n) => { x.heal(n.heal); x.hit(2); },
  },
  {
    id: 'gold', name: '黃金避險', theme: 'safe', rarity: 'common', type: 'defense', cost: [1, 1], start: true,
    base: { block: 5, heal: 3 }, up: { block: 7, heal: 4 },
    desc: (n) => `獲得 ${n.block} 護盾，回復 ${n.heal} 存款，清除 1 個負面狀態`,
    play: (x, n) => { x.block(n.block); x.heal(n.heal); x.clearOneDebuff(); },
  },
  {
    id: 'dca', name: '定期定額', theme: 'safe', rarity: 'common', type: 'combo', cost: [0, 0], start: true,
    base: { heal: 2, n: 1 }, up: { heal: 3, n: 1 },
    desc: (n) => `回復 ${n.heal} + 連擊 存款，抽 1 張`,
    play: (x, n) => { x.heal(n.heal + x.st.combo * x.N(n.n)); x.draw(1); },
  },
  {
    id: 'stoploss', name: '停損', theme: 'safe', rarity: 'uncommon', type: 'heal', cost: [1, 1], start: true,
    base: { per: 2 }, up: { per: 3 },
    desc: (n) => `清除所有曝險，每清除 1 層回復 ${n.per} 存款`,
    play: (x, n) => { const e = x.st.exposure; x.st.exposure = 0; if (e) x.heal(e * n.per); },
  },
  {
    id: 'medical', name: '醫療險', theme: 'safe', rarity: 'uncommon', type: 'defense', cost: [1, 1], start: true,
    base: { block: 5 }, up: { block: 7 },
    desc: (n) => `獲得 ${n.block} 護盾；本回合受到傷害時，回復該傷害的一半`,
    play: (x, n) => { x.block(n.block); x.tf.medInsurance = true; },
  },
  {
    id: 'annuity', name: '年金', theme: 'safe', rarity: 'uncommon', type: 'power', cost: [2, 2], start: false,
    base: { int: 3 }, up: { int: 5 },
    desc: (n) => `每回合開始獲得 ${n.int} 利息，持續三回合`,
    play: (x, n) => { x.pw.annuity = Math.max(x.pw.annuity, n.int); x.pw.annuityTurns = 3; },
  },
  {
    id: 'highdiv', name: '高股息', theme: 'safe', rarity: 'epic', type: 'attack', cost: [1, 1], start: false,
    base: { cap: 45 }, up: { cap: 60 }, target: true,
    desc: (n) => `造成等同本場已回復存款一半的傷害（上限 ${n.cap}）`,
    play: (x, n) => x.hit(Math.min(n.cap, Math.floor(x.c.healed / 2))),
  },
  {
    id: 'compound', name: '複利', theme: 'safe', rarity: 'epic', type: 'power', cost: [1, 0], start: false,
    base: {}, up: {},
    desc: () => `利息不再每回合減 1`,
    play: (x) => { x.pw.compound = 1; },
  },
  {
    id: 'lifeins', name: '壽險理賠', theme: 'safe', rarity: 'legendary', type: 'power', cost: [2, 2], start: false,
    base: { to: 0.5 }, up: { to: 0.7 },
    desc: (n) => `本場戰鬥第一次存款歸零時，改為回復到 ${pct(n.to)}，並對所有怪物造成 20 傷害`,
    play: (x, n) => { x.pw.lifeInsurance = Math.max(x.pw.lifeInsurance, n.to); },
  },
];

export const CARDS: Record<string, CardDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const ALL_CARDS = defs;

export const THEMES: Record<Theme, { name: string; short: string; icon: string; blurb: string }> = {
  stock: { name: '股票', short: '股', icon: '📈', blurb: '單發高傷害，但會累積「曝險」，被打更痛。' },
  crypto: { name: '虛擬貨幣', short: '幣', icon: '🪙', blurb: '每張都能爆擊，打出就扣自己存款。' },
  deriv: { name: '衍生性商品', short: '衍', icon: '🎲', blurb: '單張很弱，靠一回合內疊「連擊」爆發。' },
  work: { name: '腳踏實地', short: '工', icon: '💼', blurb: '大量護盾，最後用護盾值轉成傷害。' },
  safe: { name: '保守型投資', short: '保', icon: '🐷', blurb: '回復與利息，慢慢磨，活得最久。' },
  neutral: { name: '中性', short: '中', icon: '💵', blurb: '' },
};

export const TYPE_NAME: Record<CardType, string> = {
  attack: '攻擊', defense: '防禦', heal: '回血', combo: '連擊', power: '能力',
};

export const RARITY_NAME: Record<Rarity, string> = {
  common: '普通', uncommon: '高級', epic: '史詩', legendary: '傳說',
};

/** Effective numbers for a card instance (upgrade, then fusion ×1.3). */
export function cardNums(id: string, up: boolean, fused: boolean): Nums {
  const d = CARDS[id];
  const n = { ...(up ? d.up : d.base) };
  if (fused) for (const k of FUSE_KEYS) if (k in n) n[k] = Math.round(n[k] * 1.3);
  return n;
}

export function cardCost(id: string, up: boolean): number {
  return CARDS[id].cost[up ? 1 : 0];
}

export function canFuse(id: string): boolean {
  const d = CARDS[id];
  return d.type !== 'power' && d.rarity !== 'legendary';
}

/** Upgrade text shown in the shop, e.g. "14 傷害". */
export function cardText(id: string, up: boolean, fused: boolean): string {
  return CARDS[id].desc(cardNums(id, up, fused));
}
