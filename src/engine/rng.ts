import type { RunState } from './types';

/** mulberry32 step stored on the run so saves replay the same luck. */
export function rand(G: RunState): number {
  let t = (G.rng = (G.rng + 0x6d2b79f5) | 0);
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function randInt(G: RunState, lo: number, hi: number): number {
  return lo + Math.floor(rand(G) * (hi - lo + 1));
}

export function pick<T>(G: RunState, arr: readonly T[]): T {
  return arr[Math.floor(rand(G) * arr.length)];
}

export function chance(G: RunState, p: number): boolean {
  return rand(G) < p;
}

export function shuffle<T>(G: RunState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand(G) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function weighted<T extends string>(G: RunState, table: Record<T, number>): T {
  const entries = Object.entries(table) as [T, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand(G) * total;
  for (const [k, w] of entries) {
    if ((r -= w) < 0) return k;
  }
  return entries[entries.length - 1][0];
}
