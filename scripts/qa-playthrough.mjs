// Plays chapter 1 through the real UI and reports the screen flow, errors and off-screen elements.
// Usage: npm run build && node scripts/qa-playthrough.mjs <width> <height> <theme> <tag>   (screenshots in $QA_DIR, default /tmp/qa)
import { chromium } from 'playwright';
const [W, H, theme, tag] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4], process.argv[5]];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const p = await b.newPage({ viewport: { width: W, height: H } });
const errs = []; p.on('pageerror', (e) => errs.push('pageerror ' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push('console ' + m.text()));
await p.goto('file://' + process.cwd() + '/dist/index.html'); await p.waitForTimeout(800);
await p.click('text=開始遊戲'); await p.waitForTimeout(1500);
await p.click(`.theme-tab.t-${theme}`); await p.click('text=出發'); await p.waitForTimeout(2000);
const seen = new Set(); const log = []; const issues = [];
async function screenName() {
  return p.evaluate(() => {
    if (document.querySelector('.hand')) return 'combat';
    const s = document.querySelector('.screen'); return s ? [...s.classList].filter((c) => c !== 'screen').join('.') || 'screen' : 'none';
  });
}
async function check(name) {
  const r = await p.evaluate(() => {
    const out = [];
    if (document.documentElement.scrollWidth > innerWidth + 1) out.push(`horizontal overflow ${document.documentElement.scrollWidth}`);
    for (const el of document.querySelectorAll('button, .monster, .card')) {
      const rc = el.getBoundingClientRect();
      if (rc.width && (rc.right > innerWidth + 2 || rc.left < -2)) out.push(`offscreen x: ${el.className} "${el.textContent.slice(0, 12)}"`);
    }
    return out;
  });
  r.forEach((x) => issues.push(`[${name}] ${x}`));
}
let turns = 0;
for (let step = 0; step < 400; step++) {
  const name = await screenName();
  if (!seen.has(name)) { seen.add(name); await p.waitForTimeout(2600); await p.screenshot({ path: `${process.env.QA_DIR ?? '/tmp/qa'}/${tag}-${String(seen.size).padStart(2, '0')}-${name}.png` }); await check(name); }
  log.push(name);
  if (name === 'combat') {
    turns++;
    for (let k = 0; k < 8; k++) {
      const cards = p.locator('.hand .card:not(.off)');
      if (!(await cards.count())) break;
      const c0 = cards.last(); await c0.click({ timeout: 3000 }); await p.waitForTimeout(120); await c0.click({ timeout: 3000 }).catch(() => {}); await p.waitForTimeout(250);
      if (await p.locator('.monster.targetable').count()) { await p.locator('.monster.targetable').first().click(); await p.waitForTimeout(250); }
      if (await screenName() !== 'combat') break;
    }
    if (await screenName() === 'combat') { const e = p.locator('.endturn:not([disabled])'); if (await e.count()) await e.click(); await p.waitForTimeout(1300); }
    else await p.waitForTimeout(1600);
    continue;
  }
  if (name.startsWith('paths')) { await p.locator('.door').first().click(); await p.waitForTimeout(2000); continue; }
  if (name.startsWith('reward')) { const c = p.locator('.card-row .card'); if (await c.count()) await c.first().click(); else await p.locator('.btn.primary, .btn.ghost').first().click(); await p.waitForTimeout(2000); continue; }
  if (name.startsWith('shop')) { await p.locator('text=離開，繼續走').click(); await p.waitForTimeout(2000); continue; }
  if (name.startsWith('event')) { const c = p.locator('.btn.choice'); if (await c.count()) { await c.first().click(); await p.waitForTimeout(500); } await p.locator('text=繼續走').click(); await p.waitForTimeout(2000); continue; }
  if (name.startsWith('relic')) { const o = p.locator('.screen.relic button:not(.ghost)'); if (await o.count()) await o.first().click(); else await p.locator('.btn.ghost').click(); await p.waitForTimeout(2000); continue; }
  if (name.startsWith('rest')) { await p.locator('text=整理好了，出發').click(); await p.waitForTimeout(2000); continue; }
  if (name.startsWith('end')) { await p.waitForTimeout(1500); await p.screenshot({ path: `${process.env.QA_DIR ?? '/tmp/qa'}/${tag}-end.png` }); break; }
  await p.waitForTimeout(800);
}
const collapsed = log.filter((x, i) => x !== log[i - 1]);
console.log(JSON.stringify({ tag, flow: collapsed, turns, errs, issues }, null, 1));
await b.close();
