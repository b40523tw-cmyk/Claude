import { useState } from 'preact/hooks';
import { ALL_CARDS, CARDS, THEMES, canFuse } from '../data/cards';
import { EVENTS } from '../data/events';
import { ALL_MONSTERS, MONSTERS } from '../data/monsters';
import { ALL_RELICS, RELICS } from '../data/relics';
import {
  FUSE_PRICE, MIN_DECK, UPGRADE_PRICE, buyCard, leaveRest, restRemove, restUpgrade, stageLength, choosePath, continueAfterExtra, fusablePairs, healAmount, leaveReward,
  price, removePrice, resolveEvent, shopFuse, shopRemove, shopUpgrade, skipReward, takeRelic, takeRewardCard,
  takeRewardHeal, type Meta,
} from '../engine/run';
import type { CardInst, MajorTheme, RunState } from '../engine/types';
import { CardView } from './CardView';
import { MonsterArt } from './MonsterArt';
import titleArt from '../assets/title.jpg';

type Bump = () => void;

const sortDeck = (d: CardInst[]) =>
  [...d].sort((a, b) => (CARDS[a.id].theme + a.id).localeCompare(CARDS[b.id].theme + b.id));

// ───────────── top bar ─────────────

export function TopBar({ G, onDeck, onMenu }: { G: RunState; onDeck: () => void; onMenu: () => void }) {
  const pct = Math.max(0, G.hp / G.maxHp);
  return (
    <header class="topbar">
      <div class="hp" aria-label={`存款 ${G.hp}/${G.maxHp}`}>
        <span class="hp-fill" style={{ width: `${pct * 100}%` }} />
        <span class="hp-text">存款 {G.hp}/{G.maxHp}{G.combat && G.combat.block > 0 ? `　🛡️${G.combat.block}` : ''}</span>
      </div>
      <span class="gold">🪙 {G.gold}</span>
      <span class="where">第 {G.chapter} 章 <small>{G.fight}/{stageLength(G) || G.fight}</small></span>
      <button type="button" class="icon-btn" onClick={onDeck} aria-label="查看牌組">🂠 {G.deck.length}</button>
      <button type="button" class="icon-btn" onClick={onMenu} aria-label="選單">☰</button>
      {G.relics.length > 0 && (
        <div class="relic-row">
          {G.relics.map((r) => <span key={r} title={`${RELICS[r].name}：${RELICS[r].desc}`}>{RELICS[r].icon}</span>)}
        </div>
      )}
    </header>
  );
}

// ───────────── title & theme select ─────────────

const TITLE_ICONS = {
  play: <path d="M7 4.5v15l12-7.5z" fill="currentColor" />,
  save: <><rect x="4" y="4" width="16" height="16" rx="2.5" fill="currentColor" /><rect x="8" y="4" width="8" height="5" fill="#fff" /><rect x="7.5" y="13" width="9" height="5" rx="1" fill="#fff" /></>,
  book: <path d="M12 6.5C9.5 4.8 6.5 4.5 3.5 5v13c3-.5 6-.2 8.5 1.5m0-13c2.5-1.7 5.5-2 8.5-1.5v13c-3-.5-6-.2-8.5 1.5m0-13v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" />,
  gear: <><path d="M12 2.5l2 2.6 3.2-.6.6 3.2 2.7 1.9-1.4 3 1.4 3-2.7 1.9-.6 3.2-3.2-.6-2 2.6-2-2.6-3.2.6-.6-3.2L3 15.6l1.4-3L3 9.6l2.7-1.9.6-3.2 3.2.6z" fill="currentColor" /><circle cx="12" cy="12.6" r="3.2" fill="#fff" /></>,
};

export function Title({ hasSave, onNew, onContinue, onCodex, onHelp }: {
  hasSave: boolean; onNew: () => void; onContinue: () => void; onCodex: () => void; onHelp: () => void;
}) {
  const items: [string, keyof typeof TITLE_ICONS, string, () => void, boolean][] = [
    ['開始遊戲', 'play', 'tb-start', onNew, false],
    ['上次存檔', 'save', 'tb-save', onContinue, !hasSave],
    ['圖鑑', 'book', 'tb-codex', onCodex, false],
    ['說明', 'gear', 'tb-help', onHelp, false],
  ];
  return (
    <div class="title-screen" style={{ '--art': `url(${titleArt})` } as Record<string, string | number>}>
      <div class="title-stage">
        <h1 class="sr-only">Long Life</h1>
        <nav class="title-menu">
          {items.map(([label, icon, cls, fn, off]) => (
            <button type="button" key={cls} class={`tbtn ${cls}`} disabled={off} onClick={fn}>
              <svg viewBox="0 0 24 24" aria-hidden="true">{TITLE_ICONS[icon]}</svg>
              <span>{label}</span>
            </button>
          ))}
        </nav>
      </div>
      <p class="fine">v0.3 · 第 1 章「社會新鮮人」試玩版</p>
    </div>
  );
}

export function ThemeSelect({ onPick, onBack }: { onPick: (t: MajorTheme) => void; onBack: () => void }) {
  const themes: MajorTheme[] = ['stock', 'crypto', 'deriv', 'work', 'safe'];
  const [t, setT] = useState<MajorTheme>('stock');
  const samples = ALL_CARDS.filter((d) => d.theme === t && d.start).slice(0, 3);
  return (
    <div class="screen theme-select">
      <h2>選你的主修</h2>
      <p class="sub">候選卡有一半會出自主修主題。</p>
      <div class="theme-tabs" role="tablist">
        {themes.map((x) => (
          <button type="button" role="tab" aria-selected={x === t} key={x} class={`theme-tab t-${x} ${x === t ? 'on' : ''}`} onClick={() => setT(x)}>
            <span>{THEMES[x].icon}</span>{THEMES[x].name}
          </button>
        ))}
      </div>
      <p class="theme-blurb">{THEMES[t].blurb}</p>
      <div class="card-row">
        {samples.map((d) => <CardView key={d.id} card={{ uid: d.id, id: d.id, up: false, fused: false }} size="big" />)}
      </div>
      <div class="actions">
        <button type="button" class="btn" onClick={onBack}>返回</button>
        <button type="button" class="btn primary" onClick={() => onPick(t)}>主修{THEMES[t].name}，出發</button>
      </div>
    </div>
  );
}

// ───────────── paths ─────────────

export function Paths({ G, bump }: { G: RunState; bump: Bump }) {
  if (G.screen.name !== 'paths') return null;
  const opts = G.screen.options;
  return (
    <div class="screen paths">
      <h2>前面有 {opts.length} 條路</h2>
      <p class="sub">這一段還有 {stageLength(G) - G.fight} 場要打。</p>
      <div class={`doors n${opts.length}`}>
        {opts.map((o, i) => (
          <button type="button" key={i} class={`door ${o.kind === 'boss' || o.kind === 'miniboss' ? 'big' : ''}`} onClick={() => { choosePath(G, o); bump(); }}>
            <span class="door-frame"><span class="door-dark" /></span>
            <span class="door-hint">{o.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ───────────── reward ─────────────

export function Reward({ G, meta, bump }: { G: RunState; meta: Meta; bump: Bump }) {
  const [replacing, setReplacing] = useState<CardInst | null>(null);
  if (G.screen.name !== 'reward') return null;
  const s = G.screen;
  const full = G.deck.length >= G.deckCap;

  if (replacing) {
    return (
      <div class="screen">
        <h2>牌組滿了（{G.deck.length}/{G.deckCap}）</h2>
        <p class="sub">選一張移除，換成「{CARDS[replacing.id].name}」。</p>
        <DeckGrid deck={G.deck} onPick={(c) => { takeRewardCard(G, replacing, c.uid); setReplacing(null); leaveReward(G, meta); bump(); }} />
        <div class="actions"><button type="button" class="btn" onClick={() => setReplacing(null)}>算了</button></div>
      </div>
    );
  }

  return (
    <div class="screen reward">
      <h2>撐過去了</h2>
      <p class="sub">獲得 🪙 {s.gold} 金幣</p>
      {!s.picked ? (
        <>
          <p class="choose-label">二選一：拿一張卡，或回復存款</p>
          <div class="card-row">
            {s.cards.map((c) => (
              <CardView key={c.uid} card={c} size="big" onClick={() => {
                if (full) setReplacing(c);
                else { takeRewardCard(G, c); leaveReward(G, meta); bump(); }
              }} />
            ))}
          </div>
          <div class="actions">
            <button type="button" class="btn heal" onClick={() => { takeRewardHeal(G); leaveReward(G, meta); bump(); }}>
              回復 {Math.min(healAmount(G), G.maxHp - G.hp)} 存款
            </button>
            <button type="button" class="btn ghost" onClick={() => { skipReward(G); leaveReward(G, meta); bump(); }}>都不要</button>
          </div>
        </>
      ) : (
        <div class="actions">
          <button type="button" class="btn primary" onClick={() => { leaveReward(G, meta); bump(); }}>
            {s.relicDrop ? '看看它掉了什麼' : '繼續往前走'}
          </button>
        </div>
      )}
    </div>
  );
}

// ───────────── shop ─────────────

export function Shop({ G, bump }: { G: RunState; bump: Bump }) {
  const [mode, setMode] = useState<'buy' | 'remove' | 'upgrade' | 'fuse'>('buy');
  const [msg, setMsg] = useState('');
  if (G.screen.name !== 'shop') return null;
  const s = G.screen;
  const rp = removePrice(G);
  const up = price(G, UPGRADE_PRICE);
  const fp = price(G, FUSE_PRICE);
  const pairs = fusablePairs(G);
  const say = (ok: boolean, good: string, bad: string) => { setMsg(ok ? good : bad); bump(); };

  return (
    <div class="screen shop">
      <h2>深夜的雜貨店</h2>
      <p class="sub">老闆一直在數錢，頭沒有抬起來過。</p>
      <div class="seg" role="tablist">
        {([['buy', '買卡'], ['remove', `移除 ${rp}`], ['upgrade', `升級 ${up}`], ['fuse', `融合 ${fp}`]] as const).map(([k, l]) => (
          <button type="button" role="tab" aria-selected={mode === k} key={k} class={mode === k ? 'on' : ''} onClick={() => { setMode(k); setMsg(''); }}>{l}</button>
        ))}
      </div>
      {msg && <p class="toast">{msg}</p>}

      {mode === 'buy' && (
        <div class="shop-grid">
          {s.stock.map((it, i) => (
            <div key={it.card.uid} class={`shop-item ${it.sold ? 'sold' : ''}`}>
              <CardView card={it.card} size="big" disabled={it.sold || G.gold < it.price} onClick={() => {
                if (it.sold) return;
                if (G.deck.length >= G.deckCap) { setMsg('牌組滿了，先移除一張。'); return; }
                say(buyCard(G, i), `買下「${CARDS[it.card.id].name}」。`, '金幣不夠。');
              }} />
              <span class="price">{it.sold ? '已售出' : `🪙 ${it.price}`}</span>
            </div>
          ))}
        </div>
      )}
      {mode === 'remove' && (
        <>
          <p class="sub">移除費用 🪙 {rp}，每移除一次 +25。牌組至少留 5 張。</p>
          <DeckGrid deck={G.deck} onPick={(c) => say(shopRemove(G, c.uid), `移除了「${CARDS[c.id].name}」。`, '金幣不夠，或牌組太少。')} />
        </>
      )}
      {mode === 'upgrade' && (
        <>
          <p class="sub">每張卡只能升級一次。卡面顯示升級後的效果。</p>
          <DeckGrid deck={G.deck.filter((c) => !c.up)} previewUp onPick={(c) => say(shopUpgrade(G, c.uid), `「${CARDS[c.id].name}」升級了。`, '金幣不夠。')} />
        </>
      )}
      {mode === 'fuse' && (
        <>
          <p class="sub">兩張同名卡合成一張，傷害、護盾、回復 ×1.3。能力牌和傳說牌不能融合。</p>
          {pairs.length ? (
            <div class="card-row wrap">
              {pairs.map(([a]) => (
                <CardView key={a.uid} card={{ ...a, fused: true }} size="big" onClick={() => say(shopFuse(G, a.uid), `融合了兩張「${CARDS[a.id].name}」。`, '金幣不夠。')} />
              ))}
            </div>
          ) : <p class="empty">你沒有兩張一樣、可以融合的卡。</p>}
        </>
      )}
      <div class="actions">
        <button type="button" class="btn primary" onClick={() => { continueAfterExtra(G); bump(); }}>離開，繼續走</button>
      </div>
    </div>
  );
}

// ───────────── event ─────────────

export function EventScreen({ G, meta, bump }: { G: RunState; meta: Meta; bump: Bump }) {
  if (G.screen.name !== 'event') return null;
  const s = G.screen;
  const ev = EVENTS[s.eventId];
  return (
    <div class="screen event">
      <div class="event-icon" aria-hidden="true">{ev.icon}</div>
      <h2>{ev.title}</h2>
      <p class="story">{s.resolved ?? ev.text}</p>
      <div class="actions col">
        {!s.resolved ? ev.choices.map((ch, i) => (
          <button type="button" key={i} class="btn choice" onClick={() => { resolveEvent(G, i, meta); bump(); }}>
            {ch.label}{ch.hint && <small>{ch.hint}</small>}
          </button>
        )) : (
          <button type="button" class="btn primary" onClick={() => { continueAfterExtra(G); bump(); }}>繼續走</button>
        )}
      </div>
    </div>
  );
}

// ───────────── relic ─────────────

export function RelicScreen({ G, bump }: { G: RunState; bump: Bump }) {
  if (G.screen.name !== 'relic') return null;
  const opts = G.screen.options;
  return (
    <div class="screen relic">
      <h2>{opts.length ? '它留下了一些東西' : '什麼都沒掉'}</h2>
      <p class="sub">{opts.length ? '遺物整輪有效，選一個帶走。' : '你在地上撿到 100 金幣。下一章一定會掉遺物。'}</p>
      <div class="relic-list">
        {opts.map((id) => {
          const r = RELICS[id];
          return (
            <button type="button" key={id} class={`relic-card rr-${r.rarity}`} onClick={() => { takeRelic(G, id); bump(); }}>
              <span class="ricon">{r.icon}</span>
              <span class="rname">{r.name}<small>{{ common: '普通', rare: '稀有', legendary: '傳說', cursed: '詛咒' }[r.rarity]}</small></span>
              <span class="rdesc">{r.desc}{r.curse && <em>代價：{r.curse}</em>}</span>
            </button>
          );
        })}
      </div>
      <div class="actions">
        <button type="button" class="btn ghost" onClick={() => { takeRelic(G, null); bump(); }}>{opts.length ? '都不要' : '收下金幣'}</button>
      </div>
    </div>
  );
}

// ───────────── rest stop ─────────────

export function RestScreen({ G, bump }: { G: RunState; bump: Bump }) {
  const [mode, setMode] = useState<'remove' | 'upgrade'>('remove');
  if (G.screen.name !== 'rest') return null;
  const s = G.screen;
  return (
    <div class="screen rest">
      <div class="event-icon" aria-hidden="true">🛋️</div>
      <h2>回家休息一下</h2>
      <p class="sub">{s.healed > 0 ? `存款回滿了（+${s.healed}）。` : '存款是滿的。'}趁現在整理牌組。</p>
      <div class="seg" role="tablist">
        <button type="button" role="tab" aria-selected={mode === 'remove'} class={mode === 'remove' ? 'on' : ''} onClick={() => setMode('remove')}>移除卡（免費）</button>
        <button type="button" role="tab" aria-selected={mode === 'upgrade'} class={mode === 'upgrade' ? 'on' : ''} onClick={() => setMode('upgrade')}>升級 1 張{s.upgraded ? '（已用）' : ''}</button>
      </div>
      {mode === 'remove' ? (
        <>
          <p class="sub">點卡片就移除，可以移除很多張，牌組至少留 {MIN_DECK} 張（目前 {G.deck.length} 張）。</p>
          <DeckGrid deck={G.deck} onPick={(c) => { restRemove(G, c.uid); bump(); }} />
        </>
      ) : s.upgraded ? (
        <p class="sub">這次休息已經升級過一張了。</p>
      ) : (
        <>
          <p class="sub">卡面顯示升級後的效果，點一張升級。</p>
          <DeckGrid deck={G.deck.filter((c) => !c.up)} previewUp onPick={(c) => { restUpgrade(G, c.uid); bump(); }} />
        </>
      )}
      <div class="actions sticky">
        <button type="button" class="btn primary" onClick={() => { leaveRest(G); bump(); }}>整理好了，出發</button>
      </div>
    </div>
  );
}

// ───────────── end screens ─────────────

export function EndScreen({ G, win, unlocked, onDone }: { G: RunState; win: boolean; unlocked: boolean; onDone: () => void }) {
  return (
    <div class={`screen end ${win ? 'win' : 'lose'}`}>
      <div class="end-art"><MonsterArt id={win ? 'minpay' : 'revolving'} size={140} /></div>
      <h2>{win ? '第 1 章通關' : '破產了'}</h2>
      <p class="story">
        {win
          ? '卡債循環利息倒下了。它的尾巴還在動，但你決定不回頭看。'
          : '你的存款歸零了。隔天，銀行寄來一封很有禮貌的信，信封是粉紅色的。'}
      </p>
      <dl class="stats">
        <div><dt>走到</dt><dd>第 {G.chapter} 章 第 {G.fight + (G.combat ? 1 : 0)} 場</dd></div>
        <div><dt>打倒</dt><dd>{G.stats.kills} 隻</dd></div>
        <div><dt>總傷害</dt><dd>{G.stats.damage}</dd></div>
        <div><dt>打出卡牌</dt><dd>{G.stats.cardsPlayed} 張</dd></div>
      </dl>
      {unlocked && <p class="unlock">解鎖了「{THEMES[G.major].name}」的 4 張進階卡，之後的候選卡會出現它們。</p>}
      {win && <p class="sub">第 2 章「成家立業」還在施工中。</p>}
      <div class="actions"><button type="button" class="btn primary" onClick={onDone}>回到標題</button></div>
    </div>
  );
}

// ───────────── shared: deck grid / modal ─────────────

export function DeckGrid({ deck, onPick, previewUp }: { deck: CardInst[]; onPick?: (c: CardInst) => void; previewUp?: boolean }) {
  return (
    <div class="deck-grid">
      {sortDeck(deck).map((c) => (
        <CardView key={c.uid} card={c} size="big" previewUp={previewUp} onClick={onPick ? () => onPick(c) : undefined} />
      ))}
    </div>
  );
}

export function DeckModal({ G, onClose }: { G: RunState; onClose: () => void }) {
  const [tab, setTab] = useState<'deck' | 'draw' | 'discard'>('deck');
  const c = G.combat;
  const list = tab === 'deck' || !c ? G.deck : tab === 'draw' ? c.draw : c.discard;
  return (
    <div class="modal" role="dialog" aria-label="牌組">
      <div class="modal-head">
        <div class="seg">
          <button type="button" class={tab === 'deck' ? 'on' : ''} onClick={() => setTab('deck')}>牌組 {G.deck.length}/{G.deckCap}</button>
          {c && <button type="button" class={tab === 'draw' ? 'on' : ''} onClick={() => setTab('draw')}>抽牌堆 {c.draw.length}</button>}
          {c && <button type="button" class={tab === 'discard' ? 'on' : ''} onClick={() => setTab('discard')}>棄牌堆 {c.discard.length}</button>}
        </div>
        <button type="button" class="icon-btn" onClick={onClose} aria-label="關閉">✕</button>
      </div>
      {tab === 'draw' && <p class="sub">抽牌順序已打亂顯示。</p>}
      <DeckGrid deck={list} />
      {G.relics.length > 0 && tab === 'deck' && (
        <div class="relic-list small">
          {G.relics.map((id) => (
            <div key={id} class={`relic-card rr-${RELICS[id].rarity}`}>
              <span class="ricon">{RELICS[id].icon}</span>
              <span class="rname">{RELICS[id].name}</span>
              <span class="rdesc">{RELICS[id].desc}{RELICS[id].curse && <em>代價：{RELICS[id].curse}</em>}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────── codex ─────────────

export function Codex({ meta, onClose }: { meta: Meta; onClose: () => void }) {
  const [tab, setTab] = useState<'monsters' | 'cards' | 'relics'>('monsters');
  return (
    <div class="screen codex">
      <div class="modal-head">
        <div class="seg">
          <button type="button" class={tab === 'monsters' ? 'on' : ''} onClick={() => setTab('monsters')}>怪物</button>
          <button type="button" class={tab === 'cards' ? 'on' : ''} onClick={() => setTab('cards')}>卡牌</button>
          <button type="button" class={tab === 'relics' ? 'on' : ''} onClick={() => setTab('relics')}>遺物</button>
        </div>
        <button type="button" class="icon-btn" onClick={onClose} aria-label="關閉">✕</button>
      </div>
      {tab === 'monsters' && (
        <div class="codex-list">
          {ALL_MONSTERS.filter((m) => m.chapter === 1).map((m) => {
            const seen = meta.seenMonsters.includes(m.id);
            const beaten = meta.beatenMonsters.includes(m.id);
            return (
              <div key={m.id} class={`codex-mon ${seen ? '' : 'unseen'}`}>
                <MonsterArt id={m.id} size={76} />
                <div>
                  <b>{seen ? m.name : '？？？'}</b>
                  {seen && <small>存款 {m.hp}{m.passive ? ` · ${m.passive}` : ''}</small>}
                  <p>{beaten ? m.lore : seen ? '打倒它才知道它的故事。' : '還沒遇過。'}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {tab === 'cards' && (
        <div class="deck-grid">
          {ALL_CARDS.filter((d) => d.theme !== 'neutral').map((d) => {
            const open = d.start || meta.unlockedThemes.includes(d.theme as MajorTheme);
            return open
              ? <CardView key={d.id} card={{ uid: d.id, id: d.id, up: false, fused: false }} size="big" />
              : <div key={d.id} class="card big locked"><span class="name">？？？</span><span class="text">用{THEMES[d.theme].name}主修通關第 1 章解鎖</span></div>;
          })}
        </div>
      )}
      {tab === 'relics' && (
        <div class="relic-list">
          {ALL_RELICS.map((r) => meta.seenRelics.includes(r.id) ? (
            <div key={r.id} class={`relic-card rr-${r.rarity}`}>
              <span class="ricon">{r.icon}</span>
              <span class="rname">{r.name}</span>
              <span class="rdesc">{r.desc}{r.curse && <em>代價：{r.curse}</em>}</span>
            </div>
          ) : (
            <div key={r.id} class="relic-card unseen"><span class="ricon">？</span><span class="rname">？？？</span><span class="rdesc">打倒大 BOSS 才有機會見到。</span></div>
          ))}
        </div>
      )}
    </div>
  );
}

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <div class="screen help">
      <h2>怎麼玩</h2>
      <ul class="rules">
        <li><b>存款就是血量。</b>歸零就破產，這一輪結束。存款會一直帶到下一場。</li>
        <li><b>每回合有 3 點資金</b>（能量），手牌補到 5 張。沒打出的牌會留在手上，可以留著等時機。點卡片看說明，再點一次打出。</li>
        <li><b>怪物頭上的圖示</b>是它下回合要做的事。🗡️ 後面的數字是它會打你多少。</li>
        <li><b>護盾</b>先擋傷害，同一場戰鬥會一直累積，打完才清除。</li>
        <li><b>打贏後二選一</b>：拿一張新卡，或回復 20% 存款。</li>
        <li><b>岔路只有氛圍暗示</b>，大約七成準。商店和事件不算在戰鬥場數裡。</li>
        <li>第 1 章有 5 場戰鬥：第 3 場是小 BOSS，第 5 場是大 BOSS。</li>
        <li>每打完一段會回家休息：存款回滿，可以免費移除卡、升級 1 張。</li>
      </ul>
      <div class="actions"><button type="button" class="btn primary" onClick={onClose}>知道了</button></div>
    </div>
  );
}

export function Menu({ onResume, onAbandon }: { onResume: () => void; onAbandon: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <div class="modal center" role="dialog" aria-label="選單">
      <div class="menu">
        <button type="button" class="btn primary" onClick={onResume}>回到遊戲</button>
        {!confirm
          ? <button type="button" class="btn" onClick={() => setConfirm(true)}>放棄這一輪</button>
          : <button type="button" class="btn danger" onClick={onAbandon}>確定放棄（進度會消失）</button>}
      </div>
    </div>
  );
}

export { MONSTERS, canFuse };
