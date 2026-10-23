import { ALL_CARDS, CARDS, canFuse, type CardDef } from '../data/cards';
import { monstersOf } from '../data/monsters';
import { ALL_RELICS, RELICS } from '../data/relics';
import { EVENTS } from '../data/events';
import { startCombat } from './combat';
import { chance, pick, rand, randInt, shuffle, weighted } from './rng';
import type { CardInst, FightKind, MajorTheme, NodeKind, PathOption, Rarity, RunState } from './types';

export const START_HP = 70;
/**
 * Chapter layout: one array per stage, one slot per fight. `null` = the player
 * picks a path (normal / elite / shop / event); a kind = that fight is fixed.
 * A rest stop (full heal, free deck edits) follows every stage.
 */
export const CHAPTER_LAYOUT: (FightKind | null)[][] = [
  [null, null, 'miniboss', null, 'boss'],
];
export const MIN_DECK = 8;
export const HEAL_PCT = 0.2;

export interface Meta {
  unlockedThemes: MajorTheme[]; // themes whose achievement cards are unlocked
  seenMonsters: string[];
  beatenMonsters: string[];
  seenCards: string[];
  seenRelics: string[];
  runs: number;
  clears: number;
}

export function newMeta(): Meta {
  return { unlockedThemes: [], seenMonsters: [], beatenMonsters: [], seenCards: [], seenRelics: [], runs: 0, clears: 0 };
}

export function newRun(major: MajorTheme, seed = Math.floor(Math.random() * 2 ** 31)): RunState {
  const G: RunState = {
    version: 1, seed, rng: seed, major, difficulty: 0,
    hp: START_HP, maxHp: START_HP, gold: 50,
    deck: [], deckCap: 20, relics: [], chapter: 1, stage: 1, fight: 0, removes: 0,
    combat: null, screen: { name: 'combat' }, pendingFight: null, lastMonster: null,
    usedOnce: {}, battles: 0, relicGuarantee: false,
    stats: { kills: 0, damage: 0, cardsPlayed: 0 },
    nextUid: 1, fx: [], fxSeq: 0, seen: [],
  };
  for (let i = 0; i < 5; i++) addCard(G, 'parttime');
  for (let i = 0; i < 4; i++) addCard(G, 'emergency');
  addCard(G, 'ledger');
  // The first fight of a run is a straight walk forward.
  beginFight(G, 'normal');
  return G;
}

export function addCard(G: RunState, id: string, up = false, fused = false): CardInst {
  const c = { uid: `c${G.nextUid++}`, id, up, fused };
  G.deck.push(c);
  return c;
}

export function removeCard(G: RunState, uid: string) {
  G.deck = G.deck.filter((c) => c.uid !== uid);
}

// ───────────── progression ─────────────

/** Kind of the fight that comes next in this stage, if forced. */
function forcedFight(G: RunState): FightKind | null {
  return CHAPTER_LAYOUT[G.stage - 1]?.[G.fight] ?? null;
}

export function stageLength(G: RunState) {
  return CHAPTER_LAYOUT[G.stage - 1]?.length ?? 0;
}

const HINTS: Record<NodeKind, string[]> = {
  normal: [
    '右邊地上散落著帳單，有拖行的痕跡',
    '前方傳來塑膠袋摩擦的聲音，很近',
    '牆上貼滿了「最後通知」，墨水還沒乾',
  ],
  elite: [
    '空氣突然變重，牆上的數字一直在跳',
    '路燈一盞一盞熄掉，只剩前面那盞特別亮',
  ],
  shop: [
    '遠處亮著暖黃色的燈，有錢幣碰撞聲',
    '有人在哼歌，還有收銀機「叮」的一聲',
  ],
  event: [
    '一扇半開的門，裡面很安靜',
    '左邊傳來不停的電話鈴聲',
    '轉角有張紙條，寫著你的名字',
  ],
};

export function makePaths(G: RunState): PathOption[] {
  const forced = forcedFight(G);
  if (forced) {
    const opts: PathOption[] = [{
      kind: forced,
      hint: forced === 'boss' ? '走廊盡頭有一扇很大的門，門縫底下滲出紅色的利息單' : '有什麼東西在前面等你，很久了',
    }];
    if (chance(G, 0.5)) opts.push({ kind: 'shop', hint: pick(G, HINTS.shop) });
    return opts;
  }
  const count = chance(G, 0.2) ? 3 : 2;
  const early = G.stage === 1 && G.fight < 1;
  const kinds: NodeKind[] = [];
  while (kinds.length < count) {
    const k = weighted(G, { normal: 45, elite: early ? 0 : 18, shop: 15, event: 22 } as Record<NodeKind, number>);
    if (kinds.filter((x) => x === k).length < (k === 'normal' ? 2 : 1)) kinds.push(k);
  }
  if (!kinds.some((k) => k === 'normal' || k === 'elite')) kinds[0] = 'normal';
  return kinds.map((k) => ({ kind: k, hint: hintFor(G, k) }));
}

/** About 70% of hints tell the truth. */
function hintFor(G: RunState, k: NodeKind): string {
  const shown = chance(G, 0.7) ? k : pick(G, (Object.keys(HINTS) as NodeKind[]).filter((x) => x !== k));
  return pick(G, HINTS[shown]);
}

export function choosePath(G: RunState, opt: PathOption) {
  switch (opt.kind) {
    case 'shop':
      G.screen = makeShop(G);
      break;
    case 'event':
      G.screen = { name: 'event', eventId: pickEvent(G), resolved: null };
      break;
    default:
      beginFight(G, opt.kind);
  }
}

/** After a shop or event, walk on to the stage's fight. */
export function continueAfterExtra(G: RunState) {
  beginFight(G, forcedFight(G) ?? 'normal');
}

export function beginFight(G: RunState, kind: FightKind) {
  let ids: string[];
  if (kind === 'normal') {
    const pool = monstersOf(G.chapter, 'normal').filter((m) => m.id !== G.lastMonster);
    ids = [pick(G, pool).id];
  } else if (kind === 'elite') {
    ids = [pick(G, monstersOf(G.chapter, 'elite')).id];
  } else {
    ids = [monstersOf(G.chapter, kind)[0].id];
  }
  G.lastMonster = ids[0];
  G.pendingFight = kind;
  startCombat(G, kind, ids);
  G.screen = { name: 'combat' };
}

const GOLD: Record<FightKind, [number, number]> = {
  normal: [15, 25], elite: [35, 45], miniboss: [60, 60], boss: [100, 100],
};

const RARITY_TABLE: Record<FightKind, Record<Rarity, number>> = {
  normal: { common: 60, uncommon: 30, epic: 9, legendary: 1 },
  elite: { common: 30, uncommon: 50, epic: 18, legendary: 2 },
  miniboss: { common: 0, uncommon: 60, epic: 35, legendary: 5 },
  boss: { common: 0, uncommon: 0, epic: 70, legendary: 30 },
};

export function goldGain(G: RunState, base: number) {
  return Math.round(base * (G.relics.includes('cat') ? 1.5 : 1));
}

/** Called by the UI once combat.over is set. */
export function finishCombat(G: RunState, meta: Meta) {
  const c = G.combat!;
  for (const m of c.monsters) if (!meta.seenMonsters.includes(m.id)) meta.seenMonsters.push(m.id);
  if (c.over === 'lose') {
    G.screen = { name: 'gameOver' };
    return;
  }
  for (const m of c.monsters) if (!meta.beatenMonsters.includes(m.id)) meta.beatenMonsters.push(m.id);
  const kind = c.kind;
  G.combat = null;
  G.fight++;

  let gold = randInt(G, ...GOLD[kind]);
  if (G.relics.includes('piggy')) gold += 10;
  if (G.relics.includes('scratch')) gold += chance(G, 0.1) ? 100 : -5;
  if (G.relics.includes('trial') && G.battles % 3 === 0) gold -= 20;
  gold = goldGain(G, gold);
  G.gold = Math.max(0, G.gold + gold);

  G.screen = {
    name: 'reward', gold, cards: rollCards(G, RARITY_TABLE[kind], 3, meta), picked: false,
    relicDrop: kind === 'boss',
  };
}

export function cardPool(G: RunState, meta: Meta): CardDef[] {
  return ALL_CARDS.filter((d) => d.theme !== 'neutral' && (d.start || meta.unlockedThemes.includes(d.theme as MajorTheme)));
}

export function rollCards(G: RunState, table: Record<Rarity, number>, count: number, meta: Meta): CardInst[] {
  const pool = cardPool(G, meta);
  const out: CardInst[] = [];
  let guard = 0;
  while (out.length < count && guard++ < 200) {
    const others = (['stock', 'crypto', 'deriv', 'work', 'safe'] as MajorTheme[]).filter((t) => t !== G.major);
    const theme = chance(G, 0.5) ? G.major : pick(G, others);
    let rarity = weighted(G, table);
    let options = pool.filter((d) => d.theme === theme && d.rarity === rarity);
    // Fall back to any unlocked rarity of that theme, highest-first nearest.
    if (!options.length) {
      const order: Rarity[] = ['legendary', 'epic', 'uncommon', 'common'];
      for (const r of order.slice(order.indexOf(rarity))) {
        options = pool.filter((d) => d.theme === theme && d.rarity === r);
        if (options.length) { rarity = r; break; }
      }
    }
    if (!options.length) continue;
    const d = pick(G, options);
    if (out.some((o) => o.id === d.id)) continue;
    out.push({ uid: `c${G.nextUid++}`, id: d.id, up: false, fused: false });
  }
  return out;
}

export function healAmount(G: RunState) {
  let pct = HEAL_PCT;
  if (G.relics.includes('passbook')) pct = 0.3;
  if (G.relics.includes('inherited')) pct = 0.1;
  return Math.round(G.maxHp * pct);
}

export function takeRewardCard(G: RunState, card: CardInst, replaceUid?: string) {
  if (G.screen.name !== 'reward' || G.screen.picked) return;
  if (G.deck.length >= G.deckCap) {
    if (!replaceUid) return;
    removeCard(G, replaceUid);
  }
  G.deck.push({ ...card });
  G.screen.picked = true;
}

export function takeRewardHeal(G: RunState) {
  if (G.screen.name !== 'reward' || G.screen.picked) return;
  G.hp = Math.min(G.maxHp, G.hp + healAmount(G));
  G.screen.picked = true;
}

export function skipReward(G: RunState) {
  if (G.screen.name === 'reward') G.screen.picked = true;
}

/** Leave the reward screen: next paths, relic, or chapter clear. */
export function leaveReward(G: RunState, meta: Meta) {
  if (G.screen.name !== 'reward') return;
  if (G.screen.relicDrop) {
    G.screen = relicScreen(G, meta);
    return;
  }
  advance(G);
}

function advance(G: RunState) {
  if (G.fight >= stageLength(G)) {
    const healed = G.maxHp - G.hp;
    G.hp = G.maxHp;
    G.screen = { name: 'rest', healed, upgraded: false };
    return;
  }
  G.screen = { name: 'paths', options: makePaths(G) };
}

// ───────────── rest stop ─────────────

export function restRemove(G: RunState, uid: string): boolean {
  if (G.screen.name !== 'rest' || G.deck.length <= MIN_DECK) return false;
  removeCard(G, uid);
  return true;
}

export function restUpgrade(G: RunState, uid: string): boolean {
  if (G.screen.name !== 'rest' || G.screen.upgraded) return false;
  const c = G.deck.find((x) => x.uid === uid);
  if (!c || c.up) return false;
  c.up = true;
  G.screen.upgraded = true;
  return true;
}

export function leaveRest(G: RunState) {
  if (G.screen.name !== 'rest') return;
  G.fight = 0;
  G.stage++;
  if (G.stage > CHAPTER_LAYOUT.length) {
    G.screen = { name: 'chapterClear' };
    return;
  }
  G.screen = { name: 'paths', options: makePaths(G) };
}

// ───────────── relics ─────────────

function relicScreen(G: RunState, meta: Meta): RunState['screen'] {
  const drops = G.relicGuarantee || chance(G, 0.8);
  if (!drops) {
    G.gold += 100;
    G.relicGuarantee = true;
    return { name: 'relic', options: [] };
  }
  G.relicGuarantee = false;
  const majorCount = (t: MajorTheme) => G.deck.filter((c) => CARDS[c.id].theme === t).length;
  const eligible = ALL_RELICS.filter((r) =>
    !G.relics.includes(r.id) && r.rarity !== 'cursed' &&
    (r.theme === null || r.theme === G.major || majorCount(r.theme) >= 5));
  const opts: string[] = [];
  let guard = 0;
  while (opts.length < 3 && guard++ < 100) {
    const r = weighted(G, { common: 60, rare: 30, legendary: 10 });
    const cands = eligible.filter((x) => x.rarity === r && !opts.includes(x.id));
    if (cands.length) opts.push(pick(G, cands).id);
  }
  if (chance(G, 0.35)) {
    const cursed = ALL_RELICS.filter((r) => r.rarity === 'cursed' && !G.relics.includes(r.id));
    if (cursed.length) opts[opts.length - 1] = pick(G, cursed).id;
  }
  for (const id of opts) if (!meta.seenRelics.includes(id)) meta.seenRelics.push(id);
  return { name: 'relic', options: opts };
}

export function takeRelic(G: RunState, id: string | null) {
  if (id) {
    G.relics.push(id);
    if (id === 'envelope') { G.maxHp += 15; G.hp += 15; }
    if (id === 'inherited') { G.maxHp += 30; G.hp += 30; }
  }
  advance(G);
}

// ───────────── shop ─────────────

export const PRICES: Record<Rarity, number> = { common: 50, uncommon: 80, epic: 150, legendary: 300 };
export const UPGRADE_PRICE = 100;
export const FUSE_PRICE = 120;

export function price(G: RunState, base: number) {
  return Math.round(base * (G.relics.includes('group') ? 0.7 : 1));
}

export function removePrice(G: RunState) {
  return price(G, 75 + 25 * G.removes);
}

let shopMeta: Meta | null = null;
export function setShopMeta(m: Meta) { shopMeta = m; }

function makeShop(G: RunState): RunState['screen'] {
  const cards = rollCards(G, { common: 45, uncommon: 35, epic: 17, legendary: 3 }, 5, shopMeta ?? newMeta());
  return {
    name: 'shop', then: 'fight',
    stock: cards.map((card) => ({ card, price: price(G, PRICES[CARDS[card.id].rarity] + randInt(G, -5, 5)), sold: false })),
  };
}

export function buyCard(G: RunState, i: number): boolean {
  if (G.screen.name !== 'shop') return false;
  const s = G.screen.stock[i];
  if (!s || s.sold || G.gold < s.price || G.deck.length >= G.deckCap) return false;
  G.gold -= s.price;
  s.sold = true;
  G.deck.push({ ...s.card });
  return true;
}

export function shopRemove(G: RunState, uid: string): boolean {
  const p = removePrice(G);
  if (G.gold < p || G.deck.length <= 5) return false;
  G.gold -= p;
  G.removes++;
  removeCard(G, uid);
  return true;
}

export function shopUpgrade(G: RunState, uid: string): boolean {
  const c = G.deck.find((x) => x.uid === uid);
  const p = price(G, UPGRADE_PRICE);
  if (!c || c.up || G.gold < p) return false;
  G.gold -= p;
  c.up = true;
  return true;
}

/** Pairs of same-name, same-upgrade, unfused cards that can be fused. */
export function fusablePairs(G: RunState): [CardInst, CardInst][] {
  const pairs: [CardInst, CardInst][] = [];
  const seen = new Set<string>();
  for (const a of G.deck) {
    const key = `${a.id}|${a.up}`;
    if (a.fused || seen.has(key) || !canFuse(a.id)) continue;
    const b = G.deck.find((x) => x !== a && x.id === a.id && x.up === a.up && !x.fused);
    if (b) { pairs.push([a, b]); seen.add(key); }
  }
  return pairs;
}

export function shopFuse(G: RunState, uidA: string): boolean {
  const pair = fusablePairs(G).find(([a]) => a.uid === uidA);
  const p = price(G, FUSE_PRICE);
  if (!pair || G.gold < p) return false;
  G.gold -= p;
  const [a, b] = pair;
  removeCard(G, b.uid);
  a.fused = true;
  return true;
}

// ───────────── events ─────────────

function pickEvent(G: RunState): string {
  return pick(G, Object.keys(EVENTS));
}

export function resolveEvent(G: RunState, choice: number, meta: Meta) {
  if (G.screen.name !== 'event' || G.screen.resolved) return;
  const ev = EVENTS[G.screen.eventId];
  const result = ev.choices[choice].run(G, meta, { rand: () => rand(G), shuffle: (a) => shuffle(G, a) });
  G.screen.resolved = result;
}

export function relicName(id: string) {
  return RELICS[id]?.name ?? id;
}
