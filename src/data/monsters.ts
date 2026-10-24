import type { Intent, MonsterState } from '../engine/types';

export type MonsterKind = 'normal' | 'elite' | 'miniboss' | 'boss' | 'minion';

export interface MonsterDef {
  id: string;
  name: string;
  kind: MonsterKind;
  chapter: number;
  hp: number;
  atk: number;
  /** What this monster tests, shown in the codex. */
  test: string;
  /** Short line under the name in combat. */
  passive?: string;
  lore: string;
  /** The intent for the monster's next action. `m.t` = actions already taken. */
  next(m: MonsterState): Intent;
}

const defs: MonsterDef[] = [
  {
    id: 'rent', name: '房租上漲', kind: 'normal', chapter: 1, hp: 30, atk: 7, test: '拖太久的牌組',
    passive: '每 3 回合攻擊力 +2',
    lore: '房東說今年只漲一點點。去年也是一點點，前年也是。',
    next: (m) => ((m.t + 1) % 3 === 0 ? { kind: 'attack', dmg: m.atk + 2, buff: 2 } : { kind: 'attack', dmg: m.atk }),
  },
  {
    id: 'phone', name: '新手機上市', kind: 'normal', chapter: 1, hp: 22, atk: 14, test: '沒防禦的牌組',
    passive: '重擊一次，休息兩回合',
    lore: '你的舊手機沒壞，只是在發表會隔天突然變得很慢。',
    next: (m) => (m.t % 3 === 0 ? { kind: 'attack', dmg: m.atk } : { kind: 'rest' }),
  },
  {
    id: 'card', name: '信用卡帳單', kind: 'normal', chapter: 1, hp: 28, atk: 6, test: '慢熱的牌組',
    passive: '負債：每回合失去 1 存款/層',
    lore: '「最低應繳金額」是銀行最溫柔的陪伴，它會陪你很多很多年。',
    next: (m) => ({ kind: 'attackDebt', dmg: m.atk, debt: 1 }),
  },
  {
    id: 'sub', name: '訂閱吸血鬼', kind: 'normal', chapter: 1, hp: 24, atk: 5, test: '低輸出的牌組',
    passive: '攻擊時回復自己',
    lore: '你上次打開那個串流平台是三個月前，但它每個月都記得你。',
    next: (m) => ({ kind: 'attackHeal', dmg: m.atk, heal: 2 }),
  },
  {
    id: 'scam', name: '詐騙電話', kind: 'normal', chapter: 1, hp: 26, atk: 5, test: '虛擬貨幣',
    passive: '你每次爆擊，它偷走 3 存款',
    lore: '「您好，這裡是檢察署。」檢察署從來不會在晚上十一點打給你，但它會。',
    next: (m) => ({ kind: 'attack', dmg: m.atk }),
  },
  {
    id: 'boss_evil', name: '惡質老闆', kind: 'elite', chapter: 1, hp: 55, atk: 10, test: '高費牌組',
    passive: '每回合讓你一張手牌費用 +1',
    lore: '他說公司就是一個大家庭。家人之間，談加班費就太見外了。',
    next: (m) => ({ kind: 'attack', dmg: m.atk }),
  },
  {
    id: 'nightmarket', name: '夜市誘惑', kind: 'elite', chapter: 1, hp: 50, atk: 6, test: '單體攻擊牌組',
    passive: '每 2 回合召喚「衝動購物」',
    lore: '你只是想買一份雞排。回家時手上多了兩隻娃娃和一支不會用的果汁機。',
    next: (m) => ((m.t + 1) % 2 === 0 ? { kind: 'summon' } : { kind: 'attack', dmg: m.atk }),
  },
  {
    id: 'impulse', name: '衝動購物', kind: 'minion', chapter: 1, hp: 8, atk: 3, test: '',
    lore: '購物車裡的東西不會自己結帳。但它們很有耐心。',
    next: (m) => ({ kind: 'attack', dmg: m.atk }),
  },
  {
    id: 'studentloan', name: '學貸', kind: 'miniboss', chapter: 1, hp: 55, atk: 7, test: '綜合入門檢定',
    passive: '每 3 回合「利息計算」攻擊力 +4',
    lore: '畢業典禮那天，它是唯一確定會一直陪著你的同學。',
    next: (m) => ((m.t + 1) % 3 === 0 ? { kind: 'attack', dmg: m.atk + 4, buff: 4 } : { kind: 'attack', dmg: m.atk }),
  },
  {
    id: 'revolving', name: '卡債循環利息', kind: 'boss', chapter: 1, hp: 80, atk: 6, test: '太慢的保守型',
    passive: '攻擊力每回合 +2；存款低於一半時召喚「最低應繳」',
    lore: '年利率 15%。銀行說這叫「循環」，因為你會一直回來。',
    next: (m) => {
      const dmg = Math.max(0, m.atk + 2 * m.t - (m.flags.relief ?? 0));
      if (!m.flags.summoned && m.hp < m.maxHp / 2) return { kind: 'summon', dmg };
      return { kind: 'attack', dmg, buff: 2 };
    },
  },
  {
    id: 'minpay', name: '最低應繳', kind: 'minion', chapter: 1, hp: 12, atk: 4, test: '',
    passive: '擊倒它，BOSS 攻擊力 -5',
    lore: '每個月只要繳一點點，就能永遠不用繳完。',
    next: (m) => ({ kind: 'attack', dmg: m.atk }),
  },
];

export const MONSTERS: Record<string, MonsterDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const ALL_MONSTERS = defs;

export function monstersOf(chapter: number, kind: MonsterKind): MonsterDef[] {
  return defs.filter((d) => d.chapter === chapter && d.kind === kind);
}
