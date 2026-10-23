import { it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { newRun, newMeta, choosePath, addCard, setShopMeta, finishCombat, leaveReward } from '../src/engine/run';

it('dump states', () => {
  const meta = newMeta();
  setShopMeta(meta);
  const out: Record<string, unknown> = {};
  const G = newRun('work', 42); addCard(G, 'overtime'); addCard(G, 'overtime');
  G.gold = 400;
  choosePath(G, { kind: 'shop', hint: '' }); out.shop = JSON.parse(JSON.stringify(G));
  const E = newRun('stock', 43);
  choosePath(E, { kind: 'event', hint: '' }); out.event = JSON.parse(JSON.stringify(E));
  const B = newRun('crypto', 44);
  B.stage = 5; B.fight = 4; choosePath(B, { kind: 'boss', hint: '' }); out.boss = JSON.parse(JSON.stringify(B));
  B.combat!.monsters[0].hp = 1; B.combat!.over = 'win'; finishCombat(B, meta); leaveReward(B, meta);
  out.relic = JSON.parse(JSON.stringify(B));
  mkdirSync('dist', { recursive: true });
  writeFileSync('dist/states.json', JSON.stringify(out));
});
