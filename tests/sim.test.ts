import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/data/cards';
import { alive, canPlay, endTurn, handCost, incoming, playCard } from '../src/engine/combat';
import {
  buyCard, choosePath, continueAfterExtra, finishCombat, leaveReward, newMeta, newRun, resolveEvent,
  setShopMeta, shopRemove, skipReward, takeRelic, takeRewardCard, takeRewardHeal, type Meta,
} from '../src/engine/run';
import type { MajorTheme, RunState } from '../src/engine/types';

/** A simple greedy bot: enough to smoke-test every system and get rough balance numbers. */
function botTurn(G: RunState) {
  const c = G.combat!;
  for (let guard = 0; guard < 30 && !c.over; guard++) {
    const incomingDmg = alive(c).reduce((s, m) => s + ('dmg' in m.intent && m.intent.dmg ? incoming(G, m.intent.dmg) : 0), 0);
    const wantBlock = incomingDmg > c.block;
    const playable = c.hand.map((h, i) => ({ h, i })).filter(({ i }) => canPlay(G, i));
    if (!playable.length) break;
    const score = ({ h, i }: { h: { id: string }; i: number }) => {
      const d = CARDS[h.id];
      let s = 0;
      if (d.type === 'power') s += 50;
      if (d.type === 'combo') s += 30;
      if (d.type === 'attack') s += 20;
      if (d.type === 'defense') s += wantBlock ? 25 : 2;
      if (d.type === 'heal') s += G.hp < G.maxHp * 0.6 ? 22 : 5;
      return s - handCost(G, i);
    };
    playable.sort((a, b) => score(b) - score(a));
    const lowest = alive(c).sort((a, b) => a.hp - b.hp)[0];
    playCard(G, playable[0].i, lowest?.uid);
  }
  if (!c.over) endTurn(G);
}

function playRun(major: MajorTheme, seed: number, meta: Meta) {
  const G = newRun(major, seed);
  setShopMeta(meta);
  for (let steps = 0; steps < 2000; steps++) {
    const s = G.screen;
    switch (s.name) {
      case 'combat': {
        let turns = 0;
        while (!G.combat!.over && turns++ < 60) botTurn(G);
        if (!G.combat!.over) G.combat!.over = 'lose';
        finishCombat(G, meta);
        break;
      }
      case 'reward': {
        const mine = s.cards.find((c) => CARDS[c.id].theme === major);
        if (G.hp < G.maxHp * 0.45) takeRewardHeal(G);
        else if (mine && G.deck.length < G.deckCap) takeRewardCard(G, mine);
        else skipReward(G);
        leaveReward(G, meta);
        break;
      }
      case 'paths': {
        const shop = s.options.find((o) => o.kind === 'shop');
        const opt = shop && G.gold >= 120 ? shop : s.options.find((o) => o.kind !== 'elite') ?? s.options[0];
        choosePath(G, opt);
        break;
      }
      case 'shop': {
        const weak = G.deck.find((c) => c.id === 'parttime');
        if (weak) shopRemove(G, weak.uid);
        s.stock.forEach((it, i) => { if (CARDS[it.card.id].theme === major) buyCard(G, i); });
        continueAfterExtra(G);
        break;
      }
      case 'event':
        resolveEvent(G, 0, meta);
        continueAfterExtra(G);
        break;
      case 'relic':
        takeRelic(G, s.options[0] ?? null);
        break;
      case 'chapterClear':
        return { win: true, G };
      case 'gameOver':
        return { win: false, G };
    }
  }
  throw new Error('run did not finish');
}

const THEMES: MajorTheme[] = ['stock', 'crypto', 'deriv', 'work', 'safe'];

describe('chapter 1 simulation', () => {
  for (const unlocked of [false, true]) {
    it(`finishes runs for every theme (all cards unlocked: ${unlocked})`, () => {
      const rows: string[] = [];
      for (const t of THEMES) {
        const meta = newMeta();
        if (unlocked) meta.unlockedThemes = [...THEMES];
        let wins = 0;
        let stageSum = 0;
        const N = 150;
        for (let i = 0; i < N; i++) {
          const { win, G } = playRun(t, 1000 + i, meta);
          if (win) wins++;
          stageSum += G.stage + G.fight / 5;
          expect(G.hp).toBeGreaterThanOrEqual(0);
        }
        rows.push(`${t.padEnd(7)} clear ${(wins / N * 100).toFixed(0).padStart(3)}%  avg stage ${(stageSum / N).toFixed(2)}`);
      }
      console.log(rows.join('\n'));
    });
  }
});
