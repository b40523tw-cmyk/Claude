import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
const out = process.argv[2];
mkdirSync(out, { recursive: true });
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
const errs = [];
p.on('pageerror', (e) => errs.push(String(e)));
p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + process.cwd() + '/dist/index.html');
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/1-title.png` });
await p.getByText('開始新的一輪').click();
await p.getByText('虛擬貨幣').click();
await p.screenshot({ path: `${out}/2-theme.png` });
await p.getByText(/出發/).click();
await p.waitForTimeout(400);
await p.screenshot({ path: `${out}/3-combat.png` });
const cards = p.locator('.hand .card');
await cards.nth(0).click();
await p.waitForTimeout(200);
await p.screenshot({ path: `${out}/4-selected.png` });
await cards.nth(0).click();
await p.waitForTimeout(250);
await p.screenshot({ path: `${out}/5-played.png` });
// auto-play until reward
for (let i = 0; i < 40; i++) {
  if (await p.locator('.reward').count()) break;
  if (await p.locator('.screen.end').count()) break;
  const n = await p.locator('.hand .card:not(.off)').count();
  if (n) { await p.locator('.hand .card:not(.off)').first().click(); await p.locator('.hand .card.sel').click(); await p.waitForTimeout(120); }
  else if (await p.locator('.endturn:not([disabled])').count()) { await p.locator('.endturn').click(); await p.waitForTimeout(900); }
  else await p.waitForTimeout(500);
}
await p.waitForTimeout(1200);
await p.screenshot({ path: `${out}/6-reward.png` });
if (await p.locator('.reward').count()) {
  await p.locator('.reward .card').first().click();
  await p.waitForTimeout(300);
  await p.screenshot({ path: `${out}/7-paths.png` });
  await p.locator('.door').first().click();
  await p.waitForTimeout(400);
  await p.screenshot({ path: `${out}/8-next.png` });
}
await p.locator('.icon-btn').first().click();
await p.waitForTimeout(200);
await p.screenshot({ path: `${out}/9-deck.png` });
console.log('errors:', errs);
await b.close();
