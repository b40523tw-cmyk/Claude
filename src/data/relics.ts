import type { MajorTheme } from '../engine/types';

export type RelicRarity = 'common' | 'rare' | 'legendary' | 'cursed';

export interface RelicDef {
  id: string;
  name: string;
  icon: string;
  rarity: RelicRarity;
  theme: MajorTheme | null;
  desc: string;
  curse?: string;
}

const defs: RelicDef[] = [
  { id: 'piggy', name: '小豬撲滿', icon: '🐖', rarity: 'common', theme: null, desc: '每場戰鬥結束 +10 金幣' },
  { id: 'envelope', name: '緊急預備金信封', icon: '✉️', rarity: 'common', theme: null, desc: '存款上限 +15' },
  { id: 'passbook', name: '舊存摺', icon: '📒', rarity: 'common', theme: null, desc: '戰鬥後回血選項改為回復 30%' },
  { id: 'notebook', name: '記帳本', icon: '📓', rarity: 'rare', theme: null, desc: '每場戰鬥第一回合多抽 2 張' },
  { id: 'book', name: '翻爛的理財書', icon: '📕', rarity: 'rare', theme: null, desc: '每場戰鬥第一回合 +1 能量' },

  { id: 'redk', name: '紅色 K 棒', icon: '🕯️', rarity: 'common', theme: 'stock', desc: '每場戰鬥開始獲得 3 多頭' },
  { id: 'scope', name: '看盤望遠鏡', icon: '🔭', rarity: 'rare', theme: 'stock', desc: '曝險每層改為 +5%' },
  { id: 'lunch', name: '股神午餐券', icon: '🎫', rarity: 'legendary', theme: 'stock', desc: '每場戰鬥第一張攻擊牌傷害 ×2' },
  { id: 'privkey', name: '私鑰紙條', icon: '🗝️', rarity: 'common', theme: 'crypto', desc: '所有爆擊率 +10%' },
  { id: 'fan', name: '礦機風扇', icon: '🌀', rarity: 'rare', theme: 'crypto', desc: '每次爆擊回復 2 存款' },
  { id: 'hdd', name: '中本聰的硬碟', icon: '💽', rarity: 'legendary', theme: 'crypto', desc: '爆擊時不會失去存款（免除該張牌的自傷）' },
  { id: 'vip', name: '券商 VIP 卡', icon: '💳', rarity: 'common', theme: 'deriv', desc: '每場戰鬥第一回合連擊從 3 開始' },
  { id: 'stoporder', name: '停損單', icon: '🛑', rarity: 'rare', theme: 'deriv', desc: '斷頭傷害減半' },
  { id: 'mm', name: '造市商席位', icon: '🪑', rarity: 'legendary', theme: 'deriv', desc: '連擊在回合結束時不歸零，改為減半' },
  { id: 'badge', name: '員工識別證', icon: '🪪', rarity: 'common', theme: 'work', desc: '每回合開始獲得 3 護盾' },
  { id: 'attendance', name: '全勤獎狀', icon: '🏅', rarity: 'rare', theme: 'work', desc: '回合內沒受到傷害，下回合 +1 能量' },
  { id: 'tenure', name: '終身職聘書', icon: '📜', rarity: 'legendary', theme: 'work', desc: '回合結束時，沒用完的能量每點轉成 5 護盾' },
  { id: 'goldbar', name: '金條', icon: '🧈', rarity: 'common', theme: 'safe', desc: '存款低於 50% 時，每回合開始回復 3' },
  { id: 'goldbook', name: '黃金存摺', icon: '📗', rarity: 'rare', theme: 'safe', desc: '每次回復存款時額外 +1' },
  { id: 'policy', name: '保單正本', icon: '📄', rarity: 'legendary', theme: 'safe', desc: '每輪一次，破產時改為回復到 25%' },

  { id: 'cat', name: '會說話的招財貓', icon: '🐈', rarity: 'cursed', theme: null, desc: '金幣獲取 +50%', curse: '每場戰鬥開始失去 3 存款（半夜會對你微笑）' },
  { id: 'trial', name: '免費試用期', icon: '🎁', rarity: 'cursed', theme: null, desc: '每場戰鬥第一回合多抽 2 張', curse: '每 3 場戰鬥自動扣 20 金幣（忘了取消）' },
  { id: 'group', name: '朋友推薦的穩賺群組', icon: '💬', rarity: 'cursed', theme: null, desc: '商店價格 -30%', curse: '每關有一場戰鬥怪物多 1 隻' },
  { id: 'scratch', name: '發光的刮刮樂', icon: '🎟️', rarity: 'cursed', theme: null, desc: '每場戰鬥結束 10% 機率拿 100 金幣', curse: '沒中就失去 5 金幣' },
  { id: 'inherited', name: '祖傳的債務', icon: '⛓️', rarity: 'cursed', theme: null, desc: '存款上限 +30', curse: '戰鬥後回血選項改為 10%' },
];

export const RELICS: Record<string, RelicDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
export const ALL_RELICS = defs;
