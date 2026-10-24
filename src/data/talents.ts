/**
 * Talent tree (design doc, 主頁 › 天賦系統). Four paths named after money habits;
 * within a path each talent must be maxed before the next one opens.
 * Points come only from player levels: +1 per level up. EXP per fight won is FIGHT_EXP;
 * the curve (100, 110, 130, 160, 200…) puts a clean chapter 1 clear at about level 5.
 * Resetting is free.
 */
export type TalentPath = 'risk' | 'income' | 'frugal' | 'compound';

export interface TalentDef {
  id: string;
  name: string;
  path: TalentPath;
  max: number;
  ultimate?: boolean;
  desc: (lv: number) => string;
}

export const PATHS: { id: TalentPath; name: string; blurb: string }[] = [
  { id: 'risk', name: '風險管理', blurb: '活下來' },
  { id: 'income', name: '開源', blurb: '多賺' },
  { id: 'frugal', name: '節流', blurb: '少花' },
  { id: 'compound', name: '複利', blurb: '長期成長' },
];

// Order inside each path is the unlock order.
export const TALENTS: TalentDef[] = [
  { id: 'emergencyFund', name: '緊急預備金', path: 'risk', max: 5, desc: (lv) => `初始存款 +${5 * lv}` },
  { id: 'stopLoss', name: '停損紀律', path: 'risk', max: 2, desc: (lv) => `存款低於 30% 時，受到傷害 -${10 * lv}%` },
  { id: 'insurance', name: '保險意識', path: 'risk', max: 1, ultimate: true, desc: () => '每輪一次，破產時以 20% 存款復活' },

  { id: 'sideIncome', name: '開源', path: 'income', max: 5, desc: (lv) => `金幣獲取 +${10 * lv}%` },
  { id: 'multiIncome', name: '多元收入', path: 'income', max: 2, desc: (lv) => `初始牌組 +${lv} 張主修主題普通卡` },
  { id: 'circle', name: '能力圈', path: 'income', max: 3, desc: (lv) => `所有卡牌傷害 +${5 * lv}%` },
  { id: 'allocation', name: '資產配置', path: 'income', max: 1, ultimate: true, desc: () => '解鎖「副修主題」，候選卡改為主修 40%、副修 30%' },

  { id: 'compare', name: '貨比三家', path: 'frugal', max: 3, desc: (lv) => `商店價格 -${5 * lv}%` },
  { id: 'declutter', name: '斷捨離', path: 'frugal', max: 3, desc: (lv) => `移除卡費用 -${15 * lv}%` },
  { id: 'homework', name: '做功課', path: 'frugal', max: 3, desc: (lv) => `岔路暗示準確度 +${10 * lv}%` },

  { id: 'interest', name: '複利效應', path: 'compound', max: 3, desc: (lv) => `每場戰鬥勝利後，金幣獲得 ${5 * lv}% 利息` },
  { id: 'discipline', name: '理財紀律', path: 'compound', max: 5, desc: (lv) => `牌組容量 +${2 * lv}` },
  { id: 'reinvest', name: '再投資', path: 'compound', max: 1, desc: () => '戰後選卡的候選卡 3 張變 4 張' },
  { id: 'freedom', name: '財務自由', path: 'compound', max: 1, ultimate: true, desc: () => '每場戰鬥第一回合 +1 資金' },
];

export const TALENT = Object.fromEntries(TALENTS.map((t) => [t.id, t])) as Record<string, TalentDef>;

/** Cost of buying the next level: 1, 2, 3… capped at 5; ultimates cost 5. */
export function talentCost(t: TalentDef, current: number): number {
  return t.ultimate ? 5 : Math.min(5, current + 1);
}

/** A talent opens once every earlier talent on its path is maxed. */
export function talentOpen(t: TalentDef, levels: Record<string, number>): boolean {
  const path = TALENTS.filter((x) => x.path === t.path);
  return path.slice(0, path.indexOf(t)).every((x) => (levels[x.id] ?? 0) >= x.max);
}

export function spentPoints(levels: Record<string, number>): number {
  let n = 0;
  for (const t of TALENTS) for (let lv = 0; lv < (levels[t.id] ?? 0); lv++) n += talentCost(t, lv);
  return n;
}

export const FIGHT_EXP = { normal: 70, elite: 100, miniboss: 120, boss: 200 } as const;

/** EXP needed to go from `level` to the next: 100, 110, 130, 160, 200, 250… */
export function expToNext(level: number): number {
  return 100 + 5 * (level - 1) * level;
}
