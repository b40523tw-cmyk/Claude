import { CARDS, cardCost, cardNums, type PlayCtx } from '../data/cards';
import { MONSTERS } from '../data/monsters';
import { pick, rand, shuffle } from './rng';
import type { CardInst, CombatState, FightKind, MonsterState, RunState } from './types';

/** Each turn the hand refills up to this many cards; unplayed cards stay. */
const HAND_DRAW = 5;
const BASE_ENERGY = 3;
const HAND_MAX = 10;

const has = (G: RunState, relic: string) => G.relics.includes(relic);

export function fx(G: RunState, target: string, text: string, kind: RunState['fx'][number]['kind']) {
  G.fx.push({ id: ++G.fxSeq, target, text, kind });
  if (G.fx.length > 40) G.fx.splice(0, G.fx.length - 40);
}

function log(G: RunState, line: string) {
  const c = G.combat!;
  c.log.push(line);
  if (c.log.length > 30) c.log.shift();
}

export function makeMonster(G: RunState, id: string): MonsterState {
  const d = MONSTERS[id];
  const m: MonsterState = {
    uid: `m${G.nextUid++}`, id, hp: d.hp, maxHp: d.hp, block: 0, t: 0, atk: d.atk,
    intent: { kind: 'rest' }, flags: {}, dead: false,
  };
  m.intent = d.next(m);
  if (!G.seen.includes(id)) G.seen.push(id);
  return m;
}

export function startCombat(G: RunState, kind: FightKind, monsterIds: string[]) {
  const c: CombatState = {
    kind,
    monsters: [],
    draw: shuffle(G, G.deck.map((x) => ({ ...x }))),
    hand: [], discard: [], exhaust: [],
    energy: 0, turn: 0, block: 0,
    st: { exposure: 0, bull: 0, combo: 0, interest: 0, debt: 0 },
    pw: {
      dividend: 0, bullMarket: 0, fomo: 0, fomoTurns: 0, frenzy: 0, leverage: 0, income: 0,
      seniority: 0, ironBowl: 0, annuity: 0, compound: 0, lifeInsurance: 0, liquidation: 0,
    },
    tf: newTurnFlags(0),
    healed: 0, firstAttackDone: false, lastTurnTookDamage: true, over: null, log: [],
  };
  G.combat = c;
  c.monsters = monsterIds.map((id) => makeMonster(G, id));
  G.battles++;

  if (has(G, 'cat')) loseHp(G, 3, '招財貓');
  if (has(G, 'redk')) c.st.bull += 3;
  startPlayerTurn(G);
}

function newTurnFlags(nextAttackCrit: number) {
  return {
    certBonus: 0, coldWallet: 0, critBonus: 0, medInsurance: false,
    nextAttackCrit, pendingNextAttackCrit: 0, tookDamage: false, slash: 0,
  };
}

export function alive(c: CombatState) {
  return c.monsters.filter((m) => !m.dead);
}

function drawCards(G: RunState, n: number) {
  const c = G.combat!;
  for (let i = 0; i < n; i++) {
    if (c.hand.length >= HAND_MAX) return;
    if (!c.draw.length) {
      if (!c.discard.length) return;
      c.draw = shuffle(G, c.discard);
      c.discard = [];
    }
    const card = c.draw.pop()!;
    c.hand.push({ ...card, costMod: 0 });
  }
}

export function startPlayerTurn(G: RunState) {
  const c = G.combat!;
  c.turn++;
  const first = c.turn === 1;

  // Shield stacks for the whole fight; these powers grow it.
  if (c.pw.seniority && c.block > 0) gainBlock(G, Math.max(1, Math.floor(c.block * 0.1 * c.pw.seniority)));
  if (c.pw.ironBowl && c.block > 0) gainBlock(G, Math.min(c.block, c.pw.ironBowl));

  c.tf = newTurnFlags(c.tf.pendingNextAttackCrit);

  let energy = BASE_ENERGY;
  if (first && has(G, 'book')) energy++;
  if (!first && has(G, 'attendance') && !c.lastTurnTookDamage) energy++;
  c.energy = energy;
  if (first && has(G, 'vip')) c.st.combo = Math.max(c.st.combo, 3);

  // Start-of-turn effects
  if (c.pw.annuity) c.st.interest += c.pw.annuity;
  if (c.st.interest > 0) {
    heal(G, c.st.interest);
    if (!c.pw.compound) c.st.interest--;
  }
  if (c.st.debt > 0) loseHp(G, c.st.debt, '負債');
  if (c.pw.fomoTurns > 0) { c.pw.fomoTurns--; loseHp(G, 3, 'FOMO'); }
  if (has(G, 'goldbar') && G.hp < G.maxHp / 2) heal(G, 3);
  if (c.pw.income) gainBlock(G, c.pw.income);
  if (has(G, 'badge')) gainBlock(G, 3);
  if (c.over) return;
  if (c.pw.dividend) randomHit(G, c.pw.dividend);
  if (c.over) return;

  for (const h of c.hand) h.costMod = 0;
  let n = Math.max(0, HAND_DRAW - c.hand.length);
  if (first && has(G, 'notebook')) n += 2;
  if (first && has(G, 'trial')) n += 2;
  drawCards(G, n);

  // 惡質老闆: one hand card costs +1 this turn
  for (const m of alive(c)) {
    if (m.id === 'boss_evil' && c.hand.length) {
      const h = pick(G, c.hand);
      h.costMod += 1;
      fx(G, m.uid, `${CARDS[h.id].name} 費用 +1`, 'info');
    }
  }
}

export function handCost(G: RunState, idx: number): number {
  const h = G.combat!.hand[idx];
  return Math.max(0, cardCost(h.id, h.up) + h.costMod);
}

export function canPlay(G: RunState, idx: number): boolean {
  const c = G.combat;
  if (!c || c.over) return false;
  const h = c.hand[idx];
  return !!h && handCost(G, idx) <= c.energy;
}

export function needsTarget(id: string) {
  return !!CARDS[id].target;
}

// ───────────── damage & healing ─────────────

export function exposureMult(G: RunState) {
  const c = G.combat!;
  return 1 + c.st.exposure * (has(G, 'scope') ? 0.05 : 0.1);
}

/** Damage a monster's attack would deal after exposure. */
export function incoming(G: RunState, dmg: number) {
  return Math.round(dmg * exposureMult(G));
}

function hurtMonster(G: RunState, m: MonsterState, dmg: number, crit: boolean) {
  let left = dmg;
  if (m.block) {
    const b = Math.min(m.block, left);
    m.block -= b;
    left -= b;
  }
  m.hp -= left;
  G.stats.damage += left;
  fx(G, m.uid, `${dmg}${crit ? '!' : ''}`, crit ? 'crit' : 'dmg');
  if (m.hp <= 0) killMonster(G, m);
}

function killMonster(G: RunState, m: MonsterState) {
  const c = G.combat!;
  m.hp = 0;
  m.dead = true;
  G.stats.kills++;
  if (m.id === 'minpay') {
    for (const b of c.monsters) if (b.id === 'revolving' && !b.dead) {
      b.flags.relief = (b.flags.relief ?? 0) + 5;
      b.intent = MONSTERS[b.id].next(b);
      fx(G, b.uid, '攻擊力 -5', 'info');
    }
  }
  const leaders = c.monsters.filter((x) => MONSTERS[x.id].kind !== 'minion');
  if (leaders.every((x) => x.dead)) {
    for (const x of c.monsters) x.dead = true;
    c.over = 'win';
  }
}

export function gainBlock(G: RunState, n: number) {
  if (n <= 0) return;
  G.combat!.block += n;
  fx(G, 'player', `+${n}`, 'block');
}

export function heal(G: RunState, n: number) {
  if (n <= 0) return;
  if (has(G, 'goldbook')) n += 1;
  const before = G.hp;
  G.hp = Math.min(G.maxHp, G.hp + n);
  const got = G.hp - before;
  if (G.combat) G.combat.healed += got;
  if (got > 0) fx(G, 'player', `+${got}`, 'heal');
}

/** Savings loss that skips shield (self-damage, debt, FOMO). */
export function loseHp(G: RunState, n: number, why: string) {
  if (n <= 0) return;
  G.hp -= n;
  fx(G, 'player', `-${n}`, 'self');
  if (G.combat) log(G, `${why}：失去 ${n} 存款`);
  checkDeath(G);
}

function checkDeath(G: RunState) {
  if (G.hp > 0) return;
  const c = G.combat;
  if (c && c.pw.lifeInsurance) {
    G.hp = Math.max(1, Math.round(G.maxHp * c.pw.lifeInsurance));
    c.pw.lifeInsurance = 0;
    fx(G, 'player', '壽險理賠！', 'info');
    return;
  }
  if (has(G, 'policy') && !G.usedOnce.policy) {
    G.usedOnce.policy = true;
    G.hp = Math.max(1, Math.round(G.maxHp * 0.25));
    fx(G, 'player', '保單正本！', 'info');
    return;
  }
  G.hp = 0;
  if (c) c.over = 'lose';
}

function hurtPlayer(G: RunState, raw: number, src: MonsterState) {
  const c = G.combat!;
  const dmg = incoming(G, raw);
  let left = dmg;
  if (c.block) {
    const b = Math.min(c.block, left);
    c.block -= b;
    left -= b;
  }
  if (left > 0) {
    G.hp -= left;
    c.tf.tookDamage = true;
    fx(G, 'player', `-${left}`, 'dmg');
    log(G, `${MONSTERS[src.id].name} 造成 ${left} 傷害`);
    if (c.tf.medInsurance) heal(G, Math.floor(left / 2));
    checkDeath(G);
  } else {
    fx(G, 'player', '擋下', 'block');
  }
}

function randomHit(G: RunState, dmg: number) {
  const c = G.combat!;
  const targets = alive(c);
  if (!targets.length) return;
  hurtMonster(G, pick(G, targets), dmg, false);
}

// ───────────── playing cards ─────────────

export function playCard(G: RunState, idx: number, targetUid?: string): boolean {
  const c = G.combat!;
  if (!canPlay(G, idx)) return false;
  const card = c.hand[idx];
  const def = CARDS[card.id];
  const n = cardNums(card.id, card.up, card.fused);
  const living = alive(c);
  let target = living.find((m) => m.uid === targetUid) ?? null;
  if (def.target && !target) target = living[0] ?? null;
  if (def.target && !target) return false;

  c.energy -= handCost(G, idx);
  c.hand.splice(idx, 1);
  G.stats.cardsPlayed++;

  const isAttack = def.type === 'attack';
  // Bull bonus applies once, to the first hit of an attack card.
  let bullBonus = 0;
  if (isAttack && c.st.bull) {
    bullBonus = c.st.bull * (card.id === 'earnings' ? n.per : 3);
    c.st.bull = 0;
  }
  // 挖礦: next attack crit bonus is used by the first attack card this turn.
  let critExtra = 0;
  if (isAttack && c.tf.nextAttackCrit) { critExtra = c.tf.nextAttackCrit; c.tf.nextAttackCrit = 0; }
  const lunch = isAttack && !c.firstAttackDone && has(G, 'lunch');
  if (isAttack) c.firstAttackDone = true;

  const x: PlayCtx = {
    c, st: c.st, pw: c.pw, tf: c.tf, target, critted: false,
    hit(dmg, crit) {
      const t = this.target && !this.target.dead ? this.target : alive(c)[0];
      if (!t) return;
      strike(t, dmg, crit);
    },
    aoe(dmg, crit) {
      for (const m of alive(c)) strike(m, dmg, crit);
    },
    randomHit: (dmg) => randomHit(G, dmg),
    block: (v) => gainBlock(G, v),
    heal: (v) => heal(G, v),
    lose(v) {
      if (this.critted && has(G, 'hdd')) return;
      loseHp(G, v, def.name);
    },
    draw: (v) => drawCards(G, v),
    gainEnergy: (v) => { c.energy += v; },
    N: (v) => v + c.pw.leverage,
    clearOneDebuff() {
      if (c.st.debt) c.st.debt = 0;
      else if (c.st.exposure) c.st.exposure = 0;
    },
  };

  function strike(m: MonsterState, dmg: number, cardCrit?: number) {
    let d = dmg + bullBonus;
    bullBonus = 0;
    if (lunch) d *= 2;
    let isCrit = false;
    if (cardCrit !== undefined || critExtra || c.tf.critBonus) {
      let p = (cardCrit ?? 0) + critExtra + c.tf.critBonus;
      if (cardCrit !== undefined && has(G, 'privkey')) p += 0.1;
      isCrit = rand(G) < p;
    }
    if (isCrit) {
      d *= c.pw.fomo ? 3 : 2;
      x.critted = true;
    }
    d = Math.max(0, Math.round(d));
    hurtMonster(G, m, d, isCrit);
    if (isCrit) onCrit();
  }

  function onCrit() {
    if (c.pw.frenzy) c.tf.critBonus += c.pw.frenzy;
    if (c.tf.coldWallet) { gainBlock(G, c.tf.coldWallet); c.tf.coldWallet = 0; }
    if (has(G, 'fan')) heal(G, 2);
    for (const m of alive(c)) if (m.id === 'scam') {
      fx(G, m.uid, '偷走 3', 'info');
      loseHp(G, 3, '詐騙電話');
    }
  }

  log(G, `打出「${def.name}」`);
  def.play(x, n);

  // After-play rules
  if (def.type === 'defense') {
    if (c.tf.certBonus) gainBlock(G, c.tf.certBonus);
    if (c.tf.slash) { c.st.combo += 1; randomHit(G, c.tf.slash); }
  }
  if (def.type === 'combo') c.st.combo += def.combo ?? 1;
  if (card.id === 'cycle' && c.st.combo >= n.th) c.energy += 1;
  if (isAttack && c.pw.bullMarket) c.st.bull += c.pw.bullMarket;

  if (def.type === 'power') c.exhaust.push(stripHand(card));
  else c.discard.push(stripHand(card));
  return true;
}

function stripHand(h: CardInst & { costMod?: number }): CardInst {
  return { uid: h.uid, id: h.id, up: h.up, fused: h.fused };
}

// ───────────── end of turn & monsters ─────────────

export function endTurn(G: RunState) {
  const c = G.combat!;
  if (c.over) return;

  if (has(G, 'tenure') && c.energy > 0) gainBlock(G, c.energy * 5);

  if (c.pw.liquidation && c.st.combo > c.pw.liquidation) {
    loseHp(G, has(G, 'stoporder') ? 5 : 10, '斷頭');
  }
  c.pw.liquidation = 0;
  c.st.combo = has(G, 'mm') ? Math.floor(c.st.combo / 2) : 0;
  if (c.over) return;

  // Snapshot: monsters summoned this turn act next turn.
  for (const m of [...c.monsters]) {
    if (m.dead) continue;
    monsterAct(G, m);
    if (c.over) return;
  }
  for (const m of alive(c)) m.intent = MONSTERS[m.id].next(m);

  c.lastTurnTookDamage = c.tf.tookDamage;
  startPlayerTurn(G);
}

function monsterAct(G: RunState, m: MonsterState) {
  const c = G.combat!;
  const it = m.intent;
  m.block = 0;
  if (it.kind === 'attack' || it.kind === 'attackDebt' || it.kind === 'attackHeal' || (it.kind === 'summon' && it.dmg)) fx(G, m.uid, '', 'act');
  switch (it.kind) {
    case 'attack':
      if (it.buff && m.id !== 'revolving') m.atk += it.buff;
      hurtPlayer(G, it.dmg, m);
      break;
    case 'attackDebt':
      hurtPlayer(G, it.dmg, m);
      c.st.debt += it.debt;
      break;
    case 'attackHeal':
      hurtPlayer(G, it.dmg, m);
      m.hp = Math.min(m.maxHp, m.hp + it.heal);
      fx(G, m.uid, `+${it.heal}`, 'heal');
      break;
    case 'summon': {
      const minion = m.id === 'revolving' ? 'minpay' : 'impulse';
      const count = c.monsters.filter((x) => x.id === minion && !x.dead).length;
      if (m.id === 'revolving') m.flags.summoned = 1;
      if (count < 2) {
        c.monsters.push(makeMonster(G, minion));
        fx(G, m.uid, `召喚${MONSTERS[minion].name}`, 'info');
      }
      if (it.dmg) hurtPlayer(G, it.dmg, m);
      break;
    }
    case 'rest':
      fx(G, m.uid, '休息中', 'info');
      break;
  }
  m.t++;
}
