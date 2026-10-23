import { backfillTalents, newMeta, type Meta } from '../engine/run';
import type { RunState } from '../engine/types';

const RUN_KEY = 'tzrg.run.v1';
const META_KEY = 'tzrg.meta.v1';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, v: unknown) {
  try {
    if (v === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable: the game still runs, it just won't resume */
  }
}

export function loadRun(): RunState | null {
  const r = read<RunState>(RUN_KEY);
  return r && r.version === 1 ? r : null;
}

export function saveRun(G: RunState | null) {
  write(RUN_KEY, G && (G.screen.name === 'gameOver' || G.screen.name === 'chapterClear') ? null : G);
}

export function loadMeta(): Meta {
  const m = { ...newMeta(), ...(read<Meta>(META_KEY) ?? {}) };
  m.talents ??= {};
  backfillTalents(m);
  return m;
}

export function saveMeta(m: Meta) {
  write(META_KEY, m);
}
