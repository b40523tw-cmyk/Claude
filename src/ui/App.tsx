import { useEffect, useRef, useState } from 'preact/hooks';
import { finishCombat, newRun, setShopMeta, type Meta } from '../engine/run';
import type { MajorTheme, RunState } from '../engine/types';
import { Combat } from './Combat';
import {
  Codex, DeckModal, Talents, EndScreen, EventScreen, Help, Menu, Paths, RelicScreen, RestScreen, Reward, Shop, ThemeSelect, Title, TopBar,
} from './Screens';
import { loadMeta, loadRun, saveMeta, saveRun } from './store';

// Painted backdrops: ch<chapter>-<screen>.jpg, or a shared picture listed in SHARED_BG.
// Screens without one keep the drawn corridor.
const backdrops = import.meta.glob('../assets/bg/*.jpg', { eager: true, import: 'default' }) as Record<string, string>;
const SHARED_BG: Record<string, string> = { theme: 'bank', reward: 'bank', shop: 'shop', talents: 'classroom' };

type View = 'title' | 'theme' | 'run' | 'codex' | 'help' | 'talents';

interface Hot {
  G: RunState | null;
  meta: Meta;
  view: View;
}

export function App({ hot }: { hot?: Partial<Hot> }) {
  const [G, setG] = useState<RunState | null>(() => hot?.G ?? loadRun());
  const [meta] = useState<Meta>(() => hot?.meta ?? loadMeta());
  const [view, setView] = useState<View>(hot?.view ?? 'title');
  const [, setTick] = useState(0);
  const [deckOpen, setDeckOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [unlockedNow, setUnlockedNow] = useState(false);

  setShopMeta(meta);

  const bump = () => {
    setTick((t) => t + 1);
    if (G) saveRun(G);
    saveMeta(meta);
  };

  useEffect(() => {
    const w = window as unknown as { claude?: { hot?: { snapshot?: (f: () => Hot) => void } } };
    w.claude?.hot?.snapshot?.(() => ({ G, meta, view }));
  });

  function start(t: MajorTheme, minor?: MajorTheme) {
    const run = newRun(t, undefined, meta.talents ?? {}, minor);
    meta.runs++;
    setG(run);
    saveRun(run);
    saveMeta(meta);
    setUnlockedNow(false);
    setView('run');
  }

  function onCombatFinish() {
    if (!G?.combat?.over) return;
    finishCombat(G, meta);
    if (G.screen.name === 'gameOver') saveRun(null);
    bump();
  }

  function backToTitle() {
    saveRun(null);
    setG(null);
    setView('title');
  }

  // Chapter clear: unlock the theme's achievement cards once.
  useEffect(() => {
    if (G?.screen.name === 'chapterClear' && !meta.unlockedThemes.includes(G.major)) {
      meta.unlockedThemes.push(G.major);
      meta.clears++;
      setUnlockedNow(true);
      saveMeta(meta);
      saveRun(null);
    }
  }, [G?.screen.name]);

  if (view === 'title' || (view === 'run' && !G)) {
    return (
      <Shell>
        <Title
          hasSave={!!G && G.screen.name !== 'gameOver' && G.screen.name !== 'chapterClear'}
          onNew={() => setView('theme')}
          onContinue={() => setView('run')}
          onCodex={() => setView('codex')}
          onTalents={() => setView('talents')}
          onHelp={() => setView('help')}
        />
      </Shell>
    );
  }
  if (view === 'theme') return <Shell scene="theme"><ThemeSelect minorUnlocked={!!meta.talents?.allocation} onPick={start} onBack={() => setView('title')} /></Shell>;
  if (view === 'talents') return <Shell scene="talents"><Talents meta={meta} save={() => { saveMeta(meta); setTick((t) => t + 1); }} onClose={() => setView('title')} /></Shell>;
  if (view === 'codex') return <Shell><Codex meta={meta} onClose={() => setView('title')} /></Shell>;
  if (view === 'help') return <Shell><Help onClose={() => setView('title')} /></Shell>;

  const run = G!;
  const s = run.screen;
  let body: preact.JSX.Element | null = null;
  if (s.name === 'combat' && run.combat) {
    body = <Combat G={run} bump={bump} onFinish={onCombatFinish} onDeck={() => setDeckOpen(true)} />;
  } else if (s.name === 'paths') body = <Paths G={run} bump={bump} />;
  else if (s.name === 'reward') body = <Reward G={run} meta={meta} bump={bump} />;
  else if (s.name === 'shop') body = <Shop G={run} bump={bump} />;
  else if (s.name === 'event') body = <EventScreen G={run} meta={meta} bump={bump} />;
  else if (s.name === 'relic') body = <RelicScreen G={run} bump={bump} />;
  else if (s.name === 'rest') body = <RestScreen G={run} bump={bump} />;
  else if (s.name === 'chapterClear') body = <EndScreen G={run} win unlocked={unlockedNow} onDone={backToTitle} />;
  else if (s.name === 'gameOver') body = <EndScreen G={run} win={false} unlocked={false} onDone={backToTitle} />;

  const ended = s.name === 'gameOver' || s.name === 'chapterClear';
  // A new key on each screen change replays the "walking forward" camera move.
  const step = `${run.chapter}-${run.stage}-${run.fight}-${s.name}`;
  return (
    <Shell ch={run.chapter} scene={s.name} step={step}>
      {!ended && <TopBar G={run} onDeck={() => setDeckOpen(true)} onMenu={() => setMenuOpen(true)} />}
      <main class="main step-in" key={step}>{body}</main>
      {deckOpen && <DeckModal G={run} onClose={() => setDeckOpen(false)} />}
      {menuOpen && (
        <Menu
          onResume={() => setMenuOpen(false)}
          onDeck={() => { setMenuOpen(false); setDeckOpen(true); }}
          onSaveQuit={() => { saveRun(run); setMenuOpen(false); setView('title'); }}
          onAbandon={() => { setMenuOpen(false); backToTitle(); }}
        />
      )}
    </Shell>
  );
}

// The fork in the road uses the chapter's combat street.
const SAME_AS: Record<string, string> = { paths: 'combat' };

function backdropFor(ch: number, scene: string): string | undefined {
  const sc = SAME_AS[scene] ?? scene;
  return backdrops[`../assets/bg/ch${ch}-${sc}.jpg`] ?? backdrops[`../assets/bg/${SHARED_BG[sc]}.jpg`];
}

function Corridor({ bg, cls = '' }: { bg?: string; cls?: string }) {
  return (
    <div class={`corridor ${bg ? 'bgimg' : ''} ${cls}`} aria-hidden="true" style={bg ? ({ '--bg': `url(${bg})` } as Record<string, string | number>) : undefined}>
      <div class="wall left" />
      <div class="wall right" />
      <div class="floor" />
      <div class="lanterns">{Array.from({ length: 6 }, (_, i) => <span key={i} style={{ '--i': i } as Record<string, string | number>} />)}</div>
    </div>
  );
}

const LEAVE_MS = 850;

// Screen changes play in two beats: the old scene walks on and fades to black,
// then the new scene fades in while the camera keeps walking.
function Shell({ children, ch = 1, scene = 'title', step }: { children: preact.ComponentChildren; ch?: number; scene?: string; step?: string }) {
  const bg = backdropFor(ch, scene);
  const last = useRef<{ step?: string; bg?: string; scene: string }>({ scene });
  const leave = useRef<{ id: string; bg?: string; scene: string } | null>(null);
  const delay = useRef<{ step?: string; ms: number }>({ ms: 0 });
  const [, redraw] = useState(0);
  if (step !== last.current.step) {
    leave.current = step && last.current.step ? { id: step, bg: last.current.bg, scene: last.current.scene } : null;
    delay.current = { step, ms: leave.current ? LEAVE_MS : 0 };
  }
  last.current = { step, bg, scene };
  useEffect(() => {
    const id = leave.current?.id;
    if (!id) return;
    const t = setTimeout(() => {
      if (leave.current?.id === id) { leave.current = null; redraw((n) => n + 1); }
    }, LEAVE_MS);
    return () => clearTimeout(t);
  }, [step]);

  const style = { '--walk-delay': `${delay.current.ms}ms`, ...(bg ? { '--bg': `url(${bg})` } : {}) } as Record<string, string | number>;
  return (
    <div class={`shell ch${ch} sc-${scene} ${bg ? 'has-bg' : ''}`} style={style}>
      <Corridor key={step ?? scene} bg={bg} cls={step ? 'walk' : ''} />
      <div class="frame">{children}</div>
      {leave.current && (
        <div class={`leave-layer sc-${leave.current.scene}`} key={leave.current.id}>
          <Corridor bg={leave.current.bg} cls="walk-out" />
        </div>
      )}
    </div>
  );
}
