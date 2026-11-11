// Drives the production build: real clicks, console errors, overflow at phone width, every state.
const puppeteer = require('puppeteer-core');
const path = require('path');
const CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:3111';
const OUT = process.argv[2];
const results = [];
const ok = (name, pass, extra = '') => { results.push(pass); console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}${extra ? '  ' + extra : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.launch({ executablePath: CH, headless: 'new', args: ['--disable-gpu'] });
  const p = await b.newPage();
  const errors = [];
  const external = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('response', (r) => { if (r.status() >= 400) console.log('HTTP', r.status(), r.url()); });
  p.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });

  const phone = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  const desk = { width: 1280, height: 860 };
  const text = () => p.evaluate(() => document.body.innerText);
  const clickText = async (t) => {
    const done = await p.evaluate((t) => {
      const el = [...document.querySelectorAll('button,a')].find((e) => e.innerText.trim().startsWith(t) && e.offsetParent !== null);
      if (el) { el.click(); return true; }
      return false;
    }, t);
    if (!done) throw new Error('no visible control: ' + t);
  };
  const go = async (route, q = '') => { await p.goto(BASE + route + q, { waitUntil: 'networkidle0' }); };

  const screens = ['verification', 'offers', 'tracking', 'duplicate'];
  for (const [vpName, vp] of [['phone', phone], ['desktop', desk]]) {
    await p.setViewport(vp);
    for (const s of screens) {
      for (const st of ['ready', 'loading', 'empty', 'error']) {
        await go(`/proto/${s}`, `?state=${st}`);
        const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        ok(`${vpName} ${s} ${st}: no sideways scroll`, over <= 0, over > 0 ? `over by ${over}px` : '');
        if (st === 'ready' || vpName === 'phone') await p.screenshot({ path: path.join(OUT, `${s}-${st}-${vpName}.png`), fullPage: st === 'ready' });
      }
    }
  }

  // Tap target audit at phone width.
  await p.setViewport(phone);
  for (const s of screens) {
    await go(`/proto/${s}`, '?state=ready');
    const small = await p.evaluate(() => [...document.querySelectorAll('.mf button, .mf a')].filter((e) => e.offsetParent).map((e) => ({ t: e.innerText.slice(0, 24), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 44));
    ok(`phone ${s}: tap targets at least 44px`, small.length === 0, JSON.stringify(small));
  }

  // Layout regressions found by eye.
  await go('/proto/verification', '?state=ready');
  const overlap = await p.evaluate(() => [...document.querySelectorAll('.mf-row-btn')].filter((row) => {
    const a = row.querySelector('.mf-c-source').getBoundingClientRect();
    const b = row.querySelector('.mf-c-time').getBoundingClientRect();
    return a.bottom > b.top + 1 && b.bottom > a.top + 1;
  }).length);
  ok('phone: source and time never overlap in check rows', overlap === 0, `${overlap} rows`);
  const ribbon = await p.evaluate(() => { const r = document.querySelector('[role=note]'); return r.scrollWidth - r.clientWidth; });
  ok('phone: ribbon text fits', ribbon <= 0, `over by ${ribbon}`);
  await go('/proto/duplicate', '?state=ready');
  ok('phone: next-step list shows bullets', (await p.evaluate(() => getComputedStyle(document.querySelector('.mf-list')).listStyleType)) === 'disc');

  // Verification flow.
  await p.setViewport(desk);
  await go('/proto/verification', '?state=ready');
  let t = await text();
  ok('check 8 fails with the exact line', t.includes('Invoice quantity 4,800 does not match Bill of Lading quantity 4,200.'));
  ok('tally starts 11/1/1/1', (await p.evaluate(() => [...document.querySelectorAll('.mf-tally .mf-money-lg')].map((e) => e.innerText).join(','))) === '11,1,1,1');
  await p.evaluate(() => [...document.querySelectorAll('.mf-row-btn')][7].click());
  await wait(100);
  t = await text();
  ok('evidence shows document fields and name note', t.includes('NORTHGATE APPAREL LTD.') && t.includes('matched after normalising'));
  ok('evidence labels source as computed', t.includes('Computed from your documents'));
  await p.screenshot({ path: path.join(OUT, 'verification-open-desktop.png'), fullPage: true });
  await clickText('Upload corrected invoice');
  await wait(1700);
  t = await text();
  ok('after fix: documents agree, partial shipment shown as info', t.includes('Documents now agree') && t.includes('Partial shipment, permitted by the PO'));
  ok('after fix: tally 12/0/1/1', (await p.evaluate(() => [...document.querySelectorAll('.mf-tally .mf-money-lg')].map((e) => e.innerText).join(','))) === '12,0,1,1');
  ok('after fix: value updates to amended', t.includes('USD 26,250 (₹22,31,250 @ 85.00)'));

  // Offers.
  await go('/proto/offers', '?state=ready');
  const order = () => p.evaluate(() => [...document.querySelectorAll('.mf-offertable thead th .mf-h2')].map((e) => e.innerText).join(' > '));
  ok('default sort is by cost', (await order()) === 'Meridian Bank > Banyan Capital > Tidewater Finance', await order());
  t = await text();
  ok('hidden fee shown with amount', t.includes('Hidden fee found') && t.includes('₹16,065'));
  ok('effective costs shown', ['12.93%', '13.53%', '16.58%'].every((x) => t.includes(x)));
  await clickText('Fastest');
  await wait(60);
  ok('sort by speed', (await order()).startsWith('Tidewater'), await order());
  await clickText('Most cash');
  await wait(60);
  ok('sort by cash', (await order()).startsWith('Tidewater'), await order());
  await clickText('Lowest cost');
  await clickText('Show the calculation');
  await wait(60);
  ok('calculation expands with arithmetic', (await text()).includes('× 365/90'));
  await clickText('Accept this offer');
  await wait(60);
  ok('accept says no money moves', (await text()).includes('No contract is signed and no money moves'));

  // Tracking.
  await go('/proto/tracking', '?state=ready');
  ok('tracking current step is delivered', (await p.evaluate(() => document.querySelector('li[aria-current=step] .mf-time-title').innerText)) === 'Delivered');
  await clickText('Confirm goods delivered');
  await wait(60);
  ok('confirm advances to repaid and records who', (await p.evaluate(() => document.querySelector('li[aria-current=step] .mf-time-title').innerText)) === 'Repaid' && (await text()).includes('Kaveri Textiles'));

  // Duplicate.
  await go('/proto/duplicate', '?state=ready');
  t = await text();
  ok('exact: blocked', t.includes('already been financed through Cashew'));
  ok('exact: never names any lender', !['Banyan', 'Tidewater', 'Meridian'].some((n) => t.includes(n)));
  ok('exact: real fingerprints are identical', t.includes('Fingerprints are identical'));
  await clickText('Altered copy');
  await wait(60);
  t = await text();
  ok('altered: flagged at 0.87', t.includes('Possible duplicate') && t.includes('0.87'), t.match(/0\.\d\d(?=\s*$)/m)?.[0] || '');
  ok('altered: never names any lender', !['Banyan', 'Tidewater', 'Meridian'].some((n) => t.includes(n)));
  await p.screenshot({ path: path.join(OUT, 'duplicate-altered-desktop.png'), fullPage: true });
  await go('/proto/duplicate', '?state=error');
  ok('registry error does not mark invoice clear', (await text()).includes('have not marked this invoice as clear'));

  // Retry recovers.
  await go('/proto/offers', '?state=error');
  await clickText('Try again');
  await wait(800);
  ok('retry recovers to loaded', (await text()).includes('Effective annual cost'));

  // Languages, at phone width, and persisted across pages.
  await p.setViewport(phone);
  for (const [label, name, sample] of [['हि', 'hi', 'सत्यापन'], ['த', 'ta', 'சரிபார்ப்பு']]) {
    await go('/proto/verification', '?state=ready');
    await clickText(label);
    await wait(500);
    t = await text();
    ok(`${name}: strings switch`, t.includes(sample));
    const over = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${name}: no sideways scroll on phone`, over <= 0);
    ok(`${name}: lang attribute set`, (await p.evaluate(() => document.querySelector('.mf').lang)) === name);
    await p.screenshot({ path: path.join(OUT, `verification-${name}-phone.png`) });
    await go('/proto/offers', '?state=ready');
    await wait(200);
    const over2 = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${name}: offers on phone, no sideways scroll, language persisted`, over2 <= 0 && (await p.evaluate(() => document.querySelector('.mf').lang)) === name);
    await p.screenshot({ path: path.join(OUT, `offers-${name}-phone.png`) });
  }
  await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });

  // Fonts really rendered: English must not fetch Indic fonts.
  const fresh = await b.createBrowserContext();
  const q = await fresh.newPage();
  const fontReqs = [];
  let bytes = 0;
  q.on('response', async (r) => { if (r.url().endsWith('.woff2')) fontReqs.push(r.url().split('/').pop()); try { bytes += (await r.buffer()).length; } catch (e) {} });
  await q.setViewport(phone);
  await q.goto(BASE + '/proto/offers?state=ready', { waitUntil: 'networkidle0' });
  const fams = await q.evaluate(async () => { await document.fonts.ready; return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family + ' ' + f.weight); });
  ok('English loads no Indic fonts', fams.length > 0 && !fams.some((f) => /ukta|fraunces|inter_/i.test(f)), `${fontReqs.length} font files`);
  console.log('INFO  font faces loaded:', fams.join(', '));
  console.log('INFO  uncompressed bytes on first load of offers:', bytes);
  await fresh.close();

  ok('no console errors in the whole run', errors.length === 0, errors.slice(0, 3).join(' | '));
  ok('no requests to external hosts', external.length === 0, external.slice(0, 3).join(' | '));
  await b.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
