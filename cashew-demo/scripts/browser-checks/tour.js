// Watches the guided demo play on the production build. Usage: node tour.js <shots dir> <speed: 1|0>. App on port 3111.
const puppeteer = require('puppeteer-core');
const path = require('path');
const BASE = 'http://localhost:3111';
const OUT = process.argv[2];
const SPEED = Number(process.argv[3] ?? 1);
const results = [];
const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); return p; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-gpu', ...(process.env.CHROME_ARGS ? process.env.CHROME_ARGS.split(' ') : [])] });
  const p = await b.newPage();
  const errors = [], external = [];
  p.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/status of 40[134]|status of 409/.test(m.text())) errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });
  await p.setViewport({ width: 1280, height: 800 });
  const text = () => p.evaluate(() => document.body.innerText);
  const api = (route, body) => p.evaluate(async (route, body) => (await fetch('/api/' + route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json(), route, body);
  const title = () => p.evaluate(() => document.querySelector('[data-testid=tour-title]')?.innerText);
  const failed = () => p.evaluate(() => document.querySelector('[data-tour-dock] [role=alert]')?.innerText);
  const button = (t) => p.evaluate((t) => { const e = [...document.querySelectorAll('[data-tour-dock] button')].find((x) => x.innerText.trim().startsWith(t)); if (e && !e.disabled) { e.click(); return true; } return false; }, t);
  const waitTitle = (t, ms = 60000) => p.waitForFunction((t) => document.querySelector('[data-testid=tour-title]')?.innerText === t, { timeout: ms, polling: 50 }, t).then(() => true, () => false);

  await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await api('demo/speed', { factor: SPEED });
  await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
  ok('landing links to the guided demo', (await text()).includes('Watch the guided demo'));
  await p.evaluate(() => [...document.querySelectorAll('a')].find((a) => a.innerText.includes('Watch the guided demo')).click());
  await p.waitForFunction(() => location.pathname === '/demo', { polling: 50 });
  await wait(1200);
  await p.screenshot({ path: path.join(OUT, '00-start.png'), fullPage: true });
  ok('start page lists the chapters', await (async () => { const t = await text(); return ['Verify once', 'Many lenders', 'The transaction', 'Trade Passport', 'Double financing'].every((x) => t.includes(x)); })());
  const started = Date.now();
  await p.evaluate(() => [...document.querySelectorAll('button')].find((x) => x.innerText.includes('Start the demo')).click());

  // Watch it to the end, capturing each step once its action is done.
  const seen = [];
  let lastFail;
  let side = false;
  for (;;) {
    const t = await title();
    const f = await failed();
    if (f) { lastFail = `${t}: ${f}`; await p.screenshot({ path: path.join(OUT, 'failed.png') }); break; }
    const holding = await p.evaluate(() => { const n = [...document.querySelectorAll('[data-tour-dock] button')].find((x) => /Next|Working|Watch again/.test(x.innerText)); return n && !n.disabled; });
    if (t && holding && !seen.includes(t)) {
      seen.push(t);
      if (t === 'Step 1: the exporter chooses' && process.env.RECOVER) await p.keyboard.press('p');
      await p.screenshot({ path: path.join(OUT, `${String(seen.length).padStart(2, '0')}.png`) });
      side = (await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)) > 0 || side;
      if (t === 'Step 4: the lender pays the exporter') { const x = await text(); ok('step 4 shows the amounts', x.includes('₹17,73,844') && x.includes('₹11,156') && x.includes('₹17,85,000')); }
      if (t === 'Step 6: the buyer pays, and it settles') { const x = await text(); ok('settlement adds up on screen', ['₹22,31,250', '₹18,30,774', '₹4,00,476', '₹21,74,320', '₹56,930'].every((v) => x.includes(v))); }
      if (t === 'Step 1: the exporter chooses' && !process.env.RECOVER) {
        // A viewer clicks around during the reading pause: the checkbox, then a button outside the dialog.
        const box = await p.evaluate(() => { const r = document.querySelector('[role=dialog] input[type=checkbox]').getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
        await p.mouse.click(box.x, box.y); await wait(100);
        ok('a real click on the page is blocked', !(await p.evaluate(() => document.querySelector('[role=dialog] input[type=checkbox]').checked)));
        ok('the viewer is told why', Boolean(await p.$('[data-testid=tour-blocked]')));
        await p.keyboard.press('Escape'); await wait(350);
        ok('Esc does not close the dialog mid-demo', Boolean(await p.$('[role=dialog]')));
      }
      if (t === 'Step 1: the exporter chooses' && process.env.RECOVER) {
        // Recreates a real failure: the dialog gets signed before the demo's turn. Scripted clicks pass the blocker.
        await wait(100);
        const hit = (label) => p.evaluate((label) => { const e = [...document.querySelectorAll('[role=dialog] button')].find((x) => x.innerText.trim().startsWith(label)); e.click(); }, label);
        await p.evaluate(() => document.querySelector('[role=dialog] input[type=checkbox]').click()); await wait(100);
        await hit('Sign with OTP'); await wait(500);
        await hit('Autofill'); await wait(100);
        await hit('Sign contract'); await wait(1500);
        ok('signed before the demo’s turn', !(await p.$('[role=dialog]')));
        await p.keyboard.press('p');
      }
      if (t === 'What a lender sees') ok('lender sees no other lender’s offer', !/Tidewater|Meridian/.test(await p.evaluate(() => document.querySelector('main').innerText)));
      if (t === 'Someone tries to finance it twice') ok('duplicate drawer names no lender', !/banyan/i.test(await p.evaluate(() => document.querySelector('[role=dialog]').innerText)));
      if (t === 'The lender is stopped too') ok('commit block names no other lender in the page', !/banyan/i.test(await p.evaluate(() => document.querySelector('main').innerText)));
    }
    if (await p.evaluate(() => [...document.querySelectorAll('[data-tour-dock] button')].some((x) => x.innerText.includes('Watch again')))) break;
    if (Date.now() - started > 12 * 60000) { lastFail = 'timed out'; break; }
    await wait(100);
  }
  const took = (Date.now() - started) / 1000;
  ok('plays to the end with no failed step', !lastFail, lastFail ?? '');
  ok('all 26 steps played', seen.length === 26, `${seen.length}`);
  console.log(`INFO  took ${Math.round(took)} s`);
  ok('nothing scrolled sideways', !side);
  await p.screenshot({ path: path.join(OUT, 'end.png') });

  // Pause, next, restart, exit
  await button('Watch again');
  ok('restart goes back to step 1', await waitTitle('Meet the exporter', 5000));
  await p.keyboard.press('p');
  await wait(100);
  ok('P pauses', await p.evaluate(() => [...document.querySelectorAll('[data-tour-dock] button')].some((x) => x.innerText.trim() === 'Play')));
  await p.waitForFunction(() => { const n = [...document.querySelectorAll('[data-tour-dock] button')].find((x) => x.innerText.trim() === 'Next'); return n && !n.disabled; }, { polling: 50, timeout: 20000 });
  await wait(6000 * (SPEED ? 1 : 0.1));
  ok('stays on the step while paused', (await title()) === 'Meet the exporter');
  await p.keyboard.press('ArrowRight');
  ok('right arrow moves on', await waitTitle('Start a trade', 5000));
  await p.waitForFunction(() => { const n = [...document.querySelectorAll('[data-tour-dock] button')].find((x) => x.innerText.trim() === 'Next'); return n && !n.disabled; }, { polling: 50, timeout: 20000 });
  await button('Next');
  ok('Next moves on', await waitTitle('Five documents go in', 5000));
  await button('Exit');
  await wait(1500);
  ok('Exit closes the dock and returns to the landing page', !(await p.$('[data-tour-dock]')) && p.url() === BASE + '/');
  ok('dock height is cleared', (await p.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--tour-height').trim())) === '0px');
  const trades = await p.evaluate(async () => { await fetch('/api/session', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ role: 'exporter' }) }); return (await (await fetch('/api/trades')).json()).trades.filter((t) => !t.history).length; });
  ok('Exit leaves a clean Scenario B', trades === 0);
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('g'); await wait(800);
  ok('G opens the guided demo', p.url().endsWith('/demo'));

  ok('no console errors or warnings', errors.length === 0, [...new Set(errors)].slice(0, 4).join(' | '));
  ok('no requests to external hosts', external.length === 0, external.slice(0, 3).join());
  await b.close();
  const n = results.filter((r) => !r).length;
  console.log(`\n${results.length - n}/${results.length} passed`);
  process.exit(n ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
