/**
 * Background music, synthesised with Web Audio so the game stays a single file.
 * Placeholder until real tracks arrive: swap a Track for an <audio> file later.
 *
 * Patterns are written one 16th note per token: a note name starts a note, "." holds it, "-" rests.
 * Drums: k kick, s snare, h hat, "." nothing.
 */
export type TrackName = 'title' | 'journey' | 'boss' | 'end';
export type SfxName = 'click' | 'nope' | 'play' | 'hit' | 'hurt' | 'heal' | 'block';

interface Track {
  bpm: number;
  lead: string;
  bass: string;
  drums: string;
  leadWave: OscillatorType;
  leadCut: number; // lowpass on the lead, Hz
}

const bounce = (roots: string[]) => roots.map((r) => `${r}2 . ${r}3 . `.repeat(4)).join('');

const TRACKS: Record<TrackName, Track> = {
  // Music box over a sunset street; the A♭ adds the slightly-off feeling.
  title: {
    bpm: 92, leadWave: 'triangle', leadCut: 6000,
    lead:
      'E5 . G5 . C6 . G5 . E5 . G5 . A5 . G5 . ' +
      'F5 . A5 . C6 . A5 . Ab5 . . . G5 . . . ' +
      'E5 . G5 . C6 . E6 . D6 . C6 . B5 . G5 . ' +
      'A5 . F5 . D5 . Ab5 . G5 . . . - . . . ',
    bass:
      'C3 . . . G2 . . . C3 . . . G2 . . . ' +
      'F2 . . . C3 . . . Ab2 . . . G2 . . . ' +
      'C3 . . . G2 . . . E2 . . . G2 . . . ' +
      'F2 . . . D2 . . . Ab2 . . . G2 . . . ',
    drums: '....h.......h...'.repeat(4),
  },
  // On the road (fights, card rewards, shop): A minor, bouncing bass.
  journey: {
    bpm: 132, leadWave: 'square', leadCut: 2600,
    lead:
      'A4 . . C5 . . E5 . D5 . C5 . B4 . G4 . ' +
      'A4 . . C5 . . E5 . A5 . . . G5 . E5 . ' +
      'F5 . . E5 . . D5 . C5 . . . B4 . C5 . ' +
      'D5 . . B4 . . G#4 . E4 . . . - . . . ',
    bass: bounce(['A', 'F', 'D', 'E']),
    drums: 'k.h.s.h.k.h.s.h.'.repeat(4),
  },
  // Boss: faster, tritones and a flat sixth.
  boss: {
    bpm: 150, leadWave: 'sawtooth', leadCut: 2200,
    lead:
      'D5 . D5 . F5 . D5 . Ab5 . . . G5 . F5 . ' +
      'E5 . . . C#5 . . . D5 . . . A4 . . . ' +
      'D5 . D5 . F5 . A5 . Bb5 . . . A5 . G5 . ' +
      'F5 . E5 . C#5 . E5 . D5 . . . - . . . ',
    bass: bounce(['D', 'A', 'Bb', 'A']),
    drums: 'k.hkk.s.k.hkk.ss'.repeat(4),
  },
  // Results: slow and bittersweet, win or lose.
  end: {
    bpm: 76, leadWave: 'triangle', leadCut: 5000,
    lead:
      'C5 . . . Eb5 . G5 . F5 . . . Eb5 . D5 . ' +
      'Eb5 . . . C5 . . . G4 . . . - . . . ' +
      'Ab4 . C5 . Eb5 . . . D5 . C5 . B4 . D5 . ' +
      'C5 . . . . . . . - . . . - . . . ',
    bass:
      'C3 . . . . . . . G2 . . . . . . . ' +
      'Ab2 . . . . . . . Eb2 . . . . . . . ' +
      'F2 . . . . . . . G2 . . . . . . . ' +
      'C3 . . . . . . . G2 . . . C2 . . . ',
    drums: '................'.repeat(4),
  },
};

const NOTE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function freq(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name)!;
  const midi = 12 * (Number(m[3]) + 1) + NOTE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Parse a pattern into per-step notes: [frequency, length in steps] at each note start. */
function parse(p: string): ([number, number] | null)[] {
  const tok = p.trim().split(/\s+/);
  return tok.map((t, i) => {
    if (t === '.' || t === '-') return null;
    let len = 1;
    while (tok[i + len] === '.') len++;
    return [freq(t), len];
  });
}

const MUTE_KEY = 'tzrg.mute';
const VOLUME = 0.45;

class Music {
  muted = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private want: TrackName | null = null;
  private cur: { name: TrackName; t: Track; out: GainNode; cut: BiquadFilterNode; lead: ReturnType<typeof parse>; bass: ReturnType<typeof parse> } | null = null;
  private step = 0;
  private next = 0;
  private timer = 0;
  private listeners = new Set<() => void>();

  constructor() {
    try { this.muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* storage blocked */ }
    if (typeof window === 'undefined') return;
    // Browsers only allow sound after a tap.
    const unlock = () => { this.unlock(); };
    window.addEventListener('pointerdown', unlock, { once: true });
    window.addEventListener('keydown', unlock, { once: true });
    // Every button press clicks; a disabled one gives a dull thud.
    window.addEventListener('pointerdown', (e) => {
      const b = (e.target as Element | null)?.closest?.('button');
      if (!b) return;
      this.unlock();
      if (b.closest('.hand')) return; // hand cards have their own sounds (select / play)
      this.sfx(b.disabled ? 'nope' : 'click');
    }, { capture: true });
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) void this.ctx.suspend();
      else if (!this.muted) void this.ctx.resume();
    });
  }

  onChange(fn: () => void) {
    this.listeners.add(fn);
    return () => { this.listeners.delete(fn); };
  }

  play(name: TrackName) {
    this.want = name;
    if (this.ctx && this.cur?.name !== name) this.switchTo(name);
  }

  toggle() {
    this.muted = !this.muted;
    try { localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0'); } catch { /* storage blocked */ }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : VOLUME, this.ctx.currentTime, 0.05);
      if (this.muted) void this.ctx.suspend(); else void this.ctx.resume();
    }
    this.listeners.forEach((fn) => fn());
  }

  private unlock() {
    if (this.ctx) return;
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : VOLUME;
    this.master.connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = this.noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    if (this.muted) void ctx.suspend();
    if (this.want) this.switchTo(this.want);
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  private switchTo(name: TrackName) {
    const ctx = this.ctx!;
    const now = ctx.currentTime;
    if (this.cur) {
      const old = this.cur.out;
      old.gain.setTargetAtTime(0, now, 0.15);
      setTimeout(() => old.disconnect(), 1200);
    }
    const t = TRACKS[name];
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, now);
    out.gain.setTargetAtTime(1, now + 0.1, 0.2);
    out.connect(this.master!);
    const cut = ctx.createBiquadFilter();
    cut.type = 'lowpass';
    cut.frequency.value = t.leadCut;
    cut.connect(out);
    this.cur = { name, t, out, cut, lead: parse(t.lead), bass: parse(t.bass) };
    this.step = 0;
    this.next = now + 0.1;
  }

  private tick() {
    const ctx = this.ctx;
    const c = this.cur;
    if (!ctx || !c || ctx.state !== 'running') return;
    const dur = 60 / c.t.bpm / 4;
    while (this.next < ctx.currentTime + 0.15) {
      const s = this.step;
      const at = this.next;
      const ln = c.lead[s % c.lead.length];
      if (ln) this.tone(c.cut, c.t.leadWave, ln[0], at, ln[1] * dur, 0.11);
      const bn = c.bass[s % c.bass.length];
      if (bn) this.tone(c.out, 'triangle', bn[0], at, bn[1] * dur, 0.2);
      const dr = c.t.drums[s % c.t.drums.length];
      if (dr === 'k') this.kick(c.out, at);
      else if (dr === 's') this.hit(c.out, at, 0.12, 1800, 0.09);
      else if (dr === 'h') this.hit(c.out, at, 0.03, 7000, 0.04);
      this.next += dur;
      this.step = (s + 1) % Math.max(c.lead.length, c.bass.length);
    }
  }

  private tone(dest: AudioNode, wave: OscillatorType, f: number, at: number, len: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.value = f;
    const end = at + Math.max(0.05, len * 0.92);
    g.gain.setValueAtTime(0, at);
    g.gain.linearRampToValueAtTime(vol, at + 0.012);
    g.gain.exponentialRampToValueAtTime(vol * 0.55, at + Math.min(0.25, len));
    g.gain.exponentialRampToValueAtTime(0.0001, end);
    o.connect(g).connect(dest);
    o.start(at);
    o.stop(end + 0.02);
  }

  /** Sound effects, through the same master volume and mute as the music. */
  sfx(kind: SfxName) {
    const ctx = this.ctx;
    const out = this.master;
    if (!ctx || !out || this.muted) return;
    const at = ctx.currentTime + 0.005;
    switch (kind) {
      case 'click': // bright pop
        this.sweep(out, 'square', 660, 1320, at, 0.08, 0.1);
        break;
      case 'nope': // dull thud
        this.sweep(out, 'triangle', 180, 110, at, 0.12, 0.18);
        break;
      case 'play': // card flick: a swish and a blip
        this.noiseSweep(out, at, 0.14, 900, 4000, 0.16);
        this.sweep(out, 'triangle', 520, 880, at + 0.03, 0.08, 0.08);
        break;
      case 'hit': // punch landing on a monster
        this.noiseSweep(out, at, 0.1, 2500, 400, 0.3);
        this.sweep(out, 'square', 320, 70, at, 0.13, 0.16);
        break;
      case 'hurt': // the player gets hit: low crunch, falling
        this.noiseSweep(out, at, 0.18, 1200, 200, 0.3);
        this.sweep(out, 'sawtooth', 240, 60, at, 0.28, 0.14);
        this.sweep(out, 'sawtooth', 247, 62, at, 0.28, 0.1);
        break;
      case 'heal': // rising sparkle
        [1047, 1319, 1568, 2093].forEach((f, i) => this.sweep(out, 'sine', f, f, at + i * 0.06, 0.16, 0.12));
        break;
      case 'block': // metal clang
        this.sweep(out, 'square', 520, 500, at, 0.22, 0.07);
        this.sweep(out, 'square', 784, 760, at, 0.18, 0.05);
        this.noiseSweep(out, at, 0.04, 6000, 6000, 0.15);
        break;
    }
  }

  private sweep(dest: AudioNode, wave: OscillatorType, f0: number, f1: number, at: number, len: number, vol: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = wave;
    o.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, at + len);
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g).connect(dest);
    o.start(at);
    o.stop(at + len + 0.02);
  }

  private noiseSweep(dest: AudioNode, at: number, len: number, f0: number, f1: number, vol: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = 1.2;
    f.frequency.setValueAtTime(f0, at);
    if (f1 !== f0) f.frequency.exponentialRampToValueAtTime(f1, at + len);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    src.connect(f).connect(g).connect(dest);
    src.start(at);
    src.stop(at + len + 0.02);
  }

  private kick(dest: AudioNode, at: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.setValueAtTime(130, at);
    o.frequency.exponentialRampToValueAtTime(45, at + 0.12);
    g.gain.setValueAtTime(0.35, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(g).connect(dest);
    o.start(at);
    o.stop(at + 0.18);
  }

  private hit(dest: AudioNode, at: number, len: number, hp: number, vol: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, at);
    g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    src.connect(f).connect(g).connect(dest);
    src.start(at);
    src.stop(at + len + 0.02);
  }
}

export const music = new Music();
