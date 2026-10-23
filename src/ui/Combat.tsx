import { useEffect, useRef, useState } from 'preact/hooks';
import { CARDS, cardText } from '../data/cards';
import { MONSTERS } from '../data/monsters';
import { alive, canPlay, endTurn, handCost, incoming, needsTarget, playCard } from '../engine/combat';
import type { Fx, Intent, MonsterState, RunState } from '../engine/types';
import { CardView } from './CardView';
import { MonsterArt } from './MonsterArt';

const STATUS_INFO: Record<string, [string, string]> = {
  block: ['護盾', '先擋傷害。同一場戰鬥會一直累積，戰鬥結束清除。'],
  exposure: ['曝險', '每層使你受到的傷害 +10%，戰鬥結束清除。'],
  bull: ['多頭', '每層使下一張攻擊牌 +3 傷害，打出後消耗。'],
  combo: ['連擊', '每打出一張牌 +1，連擊類的牌額外再加。回合結束歸零。'],
  interest: ['利息', '每回合開始回復 X 存款，然後 X 減 1。'],
  debt: ['負債', '每回合開始失去 1 存款/層。'],
};

const POWER_INFO: Record<string, [string, (v: number) => string]> = {
  dividend: ['存股', (v) => `每回合開始對隨機怪物造成 ${v} 傷害`],
  bullMarket: ['多頭市場', () => '每打出一張攻擊牌，獲得 1 多頭'],
  fomo: ['FOMO', () => '爆擊倍率 3 倍'],
  frenzy: ['牛市狂熱', () => '每次爆擊後，本回合爆擊率 +10%'],
  leverage: ['槓桿倍數', (v) => `所有「連擊×N」的 N +${v}`],
  income: ['穩定收入', (v) => `每回合開始獲得 ${v} 護盾`],
  seniority: ['年資', () => '每回合開始，護盾增加 10%'],
  ironBowl: ['鐵飯碗', (v) => `每回合開始，護盾翻倍（最多 +${v}）`],
  annuity: ['年金', (v) => `每回合開始獲得 ${v} 利息`],
  compound: ['複利', () => '利息不再每回合減 1'],
  lifeInsurance: ['壽險理賠', (v) => `第一次存款歸零時回復到 ${Math.round(v * 100)}%`],
};

function IntentBadge({ G, it }: { G: RunState; it: Intent }) {
  switch (it.kind) {
    case 'attack':
      return <span class="intent atk">🗡️ {incoming(G, it.dmg)}{it.buff ? <small> ↑</small> : null}</span>;
    case 'attackDebt':
      return <span class="intent atk">🗡️ {incoming(G, it.dmg)} <small>+負債</small></span>;
    case 'attackHeal':
      return <span class="intent atk">🗡️ {incoming(G, it.dmg)} <small>+回血</small></span>;
    case 'summon':
      return <span class="intent sum">📣 召喚{it.dmg ? ` 🗡️${incoming(G, it.dmg)}` : ''}</span>;
    case 'rest':
      return <span class="intent rest">💤</span>;
  }
}

interface Props {
  G: RunState;
  bump: () => void;
  onFinish: () => void;
  onDeck: () => void;
}

export function Combat({ G, bump, onFinish, onDeck }: Props) {
  const c = G.combat!;
  const [sel, setSel] = useState<number | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [floats, setFloats] = useState<Fx[]>([]);
  const [hit, setHit] = useState<Record<string, number>>({});
  const [acting, setActing] = useState<Record<string, number>>({});
  // Monsters that just died stay on screen briefly: hurt pose, two blinks, then fade.
  const [dying, setDying] = useState<Record<string, true>>({});
  const goneSeen = useRef(new Set(c.monsters.filter((m) => m.dead).map((m) => m.uid)));
  useEffect(() => {
    const fresh = c.monsters.filter((m) => m.dead && !goneSeen.current.has(m.uid)).map((m) => m.uid);
    if (!fresh.length) return;
    for (const u of fresh) goneSeen.current.add(u);
    setDying((d) => ({ ...d, ...Object.fromEntries(fresh.map((u) => [u, true as const])) }));
    setTimeout(() => setDying((d) => {
      const n = { ...d };
      for (const u of fresh) delete n[u];
      return n;
    }), 1200);
  }, [G.fxSeq]);
  const lastFx = useRef(G.fxSeq);

  // Pick up new floating numbers after each action.
  useEffect(() => {
    const fresh = G.fx.filter((f) => f.id > lastFx.current);
    lastFx.current = G.fxSeq;
    if (!fresh.length) return;
    setFloats((cur) => [...cur, ...fresh.filter((f) => f.kind !== 'act')]);
    const hits: Record<string, number> = {};
    const acts: Record<string, number> = {};
    for (const f of fresh) {
      if (f.kind === 'dmg' || f.kind === 'crit' || f.kind === 'self') hits[f.target] = f.id;
      if (f.kind === 'act') acts[f.target] = f.id;
    }
    setHit((h) => ({ ...h, ...hits }));
    setActing((a) => ({ ...a, ...acts }));
    const ids = new Set(fresh.map((f) => f.id));
    const t = setTimeout(() => {
      setFloats((cur) => cur.filter((f) => !ids.has(f.id)));
      setHit((h) => {
        const n = { ...h };
        for (const k of Object.keys(hits)) if (n[k] === hits[k]) delete n[k];
        return n;
      });
      setActing((a) => {
        const n = { ...a };
        for (const k of Object.keys(acts)) if (n[k] === acts[k]) delete n[k];
        return n;
      });
    }, 1100);
    return () => clearTimeout(t);
  }, [G.fxSeq]);

  useEffect(() => {
    if (!c.over) return;
    const t = setTimeout(onFinish, 1400);
    return () => clearTimeout(t);
  }, [c.over]);

  const living = alive(c);
  const selCard = sel !== null ? c.hand[sel] : null;
  const selNeedsTarget = selCard ? needsTarget(selCard.id) && living.length > 1 : false;

  function tapCard(i: number) {
    if (busy || c.over) return;
    setInfo(null);
    if (sel === i) {
      if (!selNeedsTarget) doPlay(i, living[0]?.uid);
      return;
    }
    setSel(i);
  }

  function doPlay(i: number, target?: string) {
    if (!canPlay(G, i)) {
      setInfo(`能量不夠：這張要 ${handCost(G, i)} 點。`);
      return;
    }
    playCard(G, i, target);
    setSel(null);
    bump();
  }

  function tapMonster(m: MonsterState) {
    if (busy || c.over) return;
    if (sel !== null && selCard && needsTarget(selCard.id)) {
      doPlay(sel, m.uid);
      return;
    }
    const d = MONSTERS[m.id];
    setInfo(`${d.name}：${d.passive ?? '沒有特殊能力'}`);
  }

  function doEndTurn() {
    if (busy || c.over) return;
    setSel(null);
    setInfo(null);
    setBusy(true);
    setTimeout(() => {
      endTurn(G);
      bump();
      setTimeout(() => setBusy(false), 450);
    }, 250);
  }

  const handW = Math.min(window.innerWidth, 480) - 32;
  const cw = 82;
  const n = c.hand.length;
  const overlap = n > 1 && n * cw > handW ? (handW - cw * n) / (n - 1) : 6;

  const floatsFor = (target: string) =>
    floats.filter((f) => f.target === target).map((f, i) => (
      <span key={f.id} class={`float ${f.kind}`} style={{ '--i': i } as Record<string, string | number>}>{f.text}</span>
    ));

  const st = c.st;
  const chips = ([
    ['block', c.block, '🛡️'], ['exposure', st.exposure, '🎯'], ['bull', st.bull, '🐂'],
    ['combo', st.combo, '🔗'], ['interest', st.interest, '🌱'], ['debt', st.debt, '🧾'],
  ] as const).filter(([, v]) => v > 0);
  const powers = Object.entries(c.pw).filter(([k, v]) => v > 0 && k in POWER_INFO);

  return (
    <div class={`combat ${hit.player ? 'hurt' : ''}`}>
      <div class="stage">
        <div class="monsters">
          {c.monsters.filter((m) => !m.dead || dying[m.uid]).map((m) => {
            const d = MONSTERS[m.id];
            const targetable = !m.dead && selCard && needsTarget(selCard.id);
            return (
              <button
                type="button"
                key={m.uid}
                disabled={m.dead}
                class={`monster k-${d.kind} ${m.dead ? 'dying' : ''} ${hit[m.uid] ? 'hit' : ''} ${acting[m.uid] ? 'acting' : ''} ${targetable ? 'targetable' : ''}`}
                onClick={() => tapMonster(m)}
                aria-label={`${d.name} 存款 ${m.hp}/${m.maxHp}`}
              >
                <IntentBadge G={G} it={m.intent} />
                <MonsterArt id={m.id} size={living.length > 2 ? 100 : living.length > 1 ? 130 : 190} pose={m.dead || hit[m.uid] ? 'hurt' : acting[m.uid] ? 'attack' : 'idle'} />
                <span class="mname">{d.name}</span>
                <span class="bar"><span style={{ width: `${(m.hp / m.maxHp) * 100}%` }} /><em>{m.hp}/{m.maxHp}</em></span>
                {m.block > 0 && <span class="mblock">🛡️{m.block}</span>}
                {floatsFor(m.uid)}
              </button>
            );
          })}
        </div>
        <div class="player-floats">{floatsFor('player')}</div>
      </div>

      <div class="status-row">
        {chips.map(([k, v, icon]) => (
          <button type="button" key={k} class={`chip s-${k}`} onClick={() => setInfo(`${STATUS_INFO[k][0]} ${v}：${STATUS_INFO[k][1]}`)}>
            {icon} {STATUS_INFO[k][0]} {v}
          </button>
        ))}
        {powers.map(([k, v]) => (
          <button type="button" key={k} class="chip power" onClick={() => setInfo(`${POWER_INFO[k][0]}：${POWER_INFO[k][1](v)}`)}>
            ✦ {POWER_INFO[k][0]}
          </button>
        ))}
        {!chips.length && !powers.length && <span class="chip ghost">沒有狀態</span>}
      </div>

      <div class="hintline" aria-live="polite">
        {info ?? (selCard
          ? (selNeedsTarget ? `點一隻怪物使用「${CARDS[selCard.id].name}」` : `再點一次打出：${cardText(selCard.id, selCard.up, selCard.fused)}`)
          : busy ? '怪物行動中…' : `第 ${c.turn} 回合　點卡牌查看，再點一次打出`)}
      </div>

      <div class="hand" style={{ '--ov': `${overlap}px` } as Record<string, string | number>}>
        {c.hand.map((h, i) => (
          <CardView
            key={h.uid}
            card={h}
            cost={handCost(G, i)}
            selected={sel === i}
            disabled={!canPlay(G, i)}
            onClick={() => tapCard(i)}
            style={{ zIndex: sel === i ? 50 : i, '--rot': `${(i - (n - 1) / 2) * 2.2}deg` } as Record<string, string | number>}
          />
        ))}
      </div>

      <div class="controls">
        <div class="energy" aria-label={`能量 ${c.energy}`}><b>{c.energy}</b><small>資金</small></div>
        <button type="button" class="pile" onClick={onDeck}>抽 {c.draw.length}<br />棄 {c.discard.length}</button>
        <button type="button" class="endturn" disabled={busy || !!c.over} onClick={doEndTurn}>結束回合</button>
      </div>
    </div>
  );
}
