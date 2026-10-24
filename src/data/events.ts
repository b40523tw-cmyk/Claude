import type { Meta } from '../engine/run';
import type { RunState } from '../engine/types';
import { CARDS } from './cards';

interface EventTools {
  rand(): number;
  shuffle<T>(a: T[]): T[];
}

export interface EventChoice {
  label: string;
  hint?: string;
  /** Returns the result text shown after choosing. */
  run(G: RunState, meta: Meta, t: EventTools): string;
}

export interface EventDef {
  id: string;
  title: string;
  icon: string;
  text: string;
  choices: EventChoice[];
}

const defs: EventDef[] = [
  {
    id: 'seminar', title: '免費理財講座', icon: '🎤',
    text: '半開的門後是一間會議室。白板上寫著「三天教你財富自由」，講師對你笑得很燦爛，便當已經幫你放好了。',
    choices: [
      {
        label: '坐下來聽完', hint: '隨機升級 1 張卡，失去 6 存款',
        run(G, _m, t) {
          const pool = t.shuffle(G.deck.filter((c) => !c.up));
          G.hp = Math.max(1, G.hp - 6);
          if (!pool.length) return '你聽完了。講師說你已經畢業了，沒有東西可以教你。你還是付了 6 存款的「教材費」。';
          pool[0].up = true;
          return `三小時後你學會了「${CARDS[pool[0].id].name}」的進階用法，也被推銷了 6 存款的會員。`;
        },
      },
      {
        label: '拿了便當就走', hint: '+15 金幣',
        run(G) { G.gold += 15; return '便當是排骨的。你把它轉賣給門口排隊的人，賺了 15 金幣。'; },
      },
    ],
  },
  {
    id: 'wallet', title: '撿到的舊錢包', icon: '👛',
    text: '地上有一個磨破的皮夾，裡面有幾張鈔票，還有一張寫著「媽，我會還你」的紙條。',
    choices: [
      {
        label: '收下鈔票', hint: '+40~60 金幣',
        run(G, _m, t) {
          const g = 40 + Math.floor(t.rand() * 21);
          G.gold += g;
          return `你拿了 ${g} 金幣。紙條你沒動，但你總覺得它在看你。`;
        },
      },
      {
        label: '原地放好，繼續走', hint: '回復 8 存款',
        run(G) { G.hp = Math.min(G.maxHp, G.hp + 8); return '你覺得自己是個好人。這種感覺值 8 存款。'; },
      },
    ],
  },
  {
    id: 'fortune', title: '路邊算命攤', icon: '🔮',
    text: '一位阿姨坐在塑膠椅上，桌上擺著水晶球和 QR code。「少年仔，你的牌組有一張很重。」',
    choices: [
      {
        label: '付 30 金幣，請她幫你斷捨離', hint: '移除 1 張最弱的起始卡',
        run(G) {
          if (G.gold < 30) return '你錢不夠。阿姨說沒關係，命運會再來找你。';
          const weak = G.deck.find((c) => c.id === 'parttime' && !c.up) ?? G.deck.find((c) => c.id === 'emergency' && !c.up);
          if (!weak || G.deck.length <= 5) return '阿姨看了很久，說你的牌組已經很精簡了，退你錢。';
          G.gold -= 30;
          G.deck = G.deck.filter((c) => c !== weak);
          return `阿姨把「${CARDS[weak.id].name}」從你的牌組裡抽走，說它會去更好的地方。`;
        },
      },
      {
        label: '問她明天的股價', hint: '???',
        run(G, _m, t) {
          if (t.rand() < 0.5) { G.gold += 50; return '她說「漲」。你不知道哪一支，但口袋裡多了 50 金幣。'; }
          G.hp = Math.max(1, G.hp - 5);
          return '她說「跌」。你連問哪一支都還沒開口，就失去了 5 存款。';
        },
      },
    ],
  },
  {
    id: 'lottery', title: '公司尾牙抽獎', icon: '🎰',
    text: '你走進一場不認識的尾牙。主持人叫到你的號碼，你不記得自己有抽號碼。',
    choices: [
      {
        label: '上台領獎', hint: '升級牌組中 1 張主修主題卡，沒有就 +30 金幣',
        run(G, _m, t) {
          const pool = t.shuffle(G.deck.filter((c) => !c.up && CARDS[c.id].theme === G.major));
          if (!pool.length) { G.gold += 30; return '獎品是 30 金幣的禮券。老闆跟你握手的時候手很冰。'; }
          pool[0].up = true;
          return `你抽到「${CARDS[pool[0].id].name}」的升級。台下沒有人鼓掌，他們都在看你。`;
        },
      },
      {
        label: '趁亂吃一桌', hint: '回復 12 存款',
        run(G) { G.hp = Math.min(G.maxHp, G.hp + 12); return '佛跳牆很好喝。你吃飽了，回復 12 存款。'; },
      },
    ],
  },
  {
    id: 'invoice', title: '發票對獎', icon: '🧾',
    text: '口袋裡掏出一疊皺巴巴的發票。今天剛好開獎。',
    choices: [
      {
        label: '一張一張對', hint: '小機率中大獎',
        run(G, _m, t) {
          const r = t.rand();
          if (r < 0.05) { G.gold += 200; return '你中了！200 金幣！你決定不告訴任何人。'; }
          if (r < 0.4) { G.gold += 20; return '中了一張兩百塊（遊戲裡是 20 金幣）。你覺得自己運氣變好了，這很危險。'; }
          return '一張都沒中。你花了二十分鐘，學到了機率。';
        },
      },
      {
        label: '捐給發票箱', hint: '回復 5 存款',
        run(G) { G.hp = Math.min(G.maxHp, G.hp + 5); return '你感到心靈富足，回復 5 存款。'; },
      },
    ],
  },
];

export const EVENTS: Record<string, EventDef> = Object.fromEntries(defs.map((d) => [d.id, d]));
