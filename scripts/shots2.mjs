import { chromium } from 'playwright';
import { mkdirSync, readFileSync } from 'node:fs';
const out = process.argv[2];
mkdirSync(out, { recursive: true });
const states = JSON.parse(readFileSync('dist/states.json', 'utf8'));
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
const errs = [];
for (const [name, st] of Object.entries(states)) {
  const p = await b.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => errs.push(name + ': ' + e));
  await p.goto('file://' + process.cwd() + '/dist/index.html');
  await p.evaluate((s) => localStorage.setItem('tzrg.run.v1', JSON.stringify(s)), st);
  await p.reload();
  await p.getByText('繼續這一輪').click();
  await p.waitForTimeout(500);
  if (name === 'shop') { await p.screenshot({ path: `${out}/s-shop.png` }); await p.getByText(/^融合/).click(); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/s-fuse.png` }); }
  else await p.screenshot({ path: `${out}/s-${name}.png` });
  if (name === 'event') { await p.locator('.choice').first().click(); await p.waitForTimeout(200); await p.screenshot({ path: `${out}/s-event2.png` }); }
  await p.close();
}
console.log('errors', errs);
await b.close();
