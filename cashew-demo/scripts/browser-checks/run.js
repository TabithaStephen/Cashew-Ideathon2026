// Drives the whole demo through the real UI. Usage: node run.js <shots dir> <speed: 1|0> [label]
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const BASE = 'http://localhost:3111';
const OUT = process.argv[2];
const SPEED = Number(process.argv[3] ?? 1);
const MIRROR = process.argv[4];
const results = [];
const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); return p; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: 'new', args: ['--disable-gpu', ...(process.env.CHROME_ARGS ? process.env.CHROME_ARGS.split(' ') : [])] });
  await b.defaultBrowserContext().overridePermissions(BASE, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
  const p = await b.newPage();
  const errors = [], external = [];
  const track = (pg) => {
    pg.on('console', (m) => { if (['error', 'warning'].includes(m.type()) && !/status of 40[134]|status of 409/.test(m.text())) errors.push(m.text()); });
    pg.on('pageerror', (e) => errors.push(String(e)));
    pg.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  };
  track(p);
  await p.setViewport({ width: 1280, height: 800 });
  const text = (pg = p) => pg.evaluate(() => document.body.innerText);
  const waitText = async (t, ms = 30000, pg = p) => { try { await pg.waitForFunction((t) => document.body.innerText.includes(t), { timeout: ms, polling: 50 }, t); return true; } catch { return false; } };
  const click = async (t, pg = p, scope) => {
    const done = await pg.evaluate((t, scope) => {
      const root = scope ? document.querySelector(scope) : document;
      const all = [...root.querySelectorAll('button,a,[role=switch]')].filter((e) => e.offsetParent !== null && !e.disabled);
      const e = all.find((x) => x.innerText.trim() === t) ?? all.find((x) => x.innerText.trim().startsWith(t));
      if (e) { e.click(); return true; }
      return false;
    }, t, scope);
    if (!done) { await pg.screenshot({ path: path.join(OUT, 'crash.png') }); throw new Error('no control: ' + t + ' on ' + pg.url()); }
  };
  const waitClick = async (t, pg = p, ms = 30000) => {
    await pg.waitForFunction((t) => [...document.querySelectorAll('button,a')].some((e) => e.offsetParent !== null && !e.disabled && e.innerText.trim().startsWith(t)), { timeout: ms, polling: 50 }, t);
    await click(t, pg);
  };
  const api = (route, body, method) => p.evaluate(async (route, body, method) => { const r = await fetch('/api/' + route, { method: method ?? (body ? 'POST' : 'GET'), headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); return r.json(); }, route, body, method);
  const noSideways = async (name, pg = p) => ok(`${name}: no sideways scroll`, (await pg.evaluate(() => document.documentElement.scrollWidth - innerWidth)) <= 0);
  const shot = (name, pg = p) => pg.screenshot({ path: path.join(OUT, name + '.png'), fullPage: true });
  const noBan = async (where, pg = p) => ok(`${where}: the word "score" never shows`, !/\bscore\b/i.test(await text(pg)));

  await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await api('demo/scenario', { id: 'B' });
  await api('demo/speed', { factor: SPEED });
  await p.goto(BASE + '/', { waitUntil: 'networkidle2' });
  await shot('01-landing');
  ok('landing: H1, three roles, no passwords', await (async () => { const x = await text(); return ['One verified trade. Many lenders.', 'Exporter', 'Lender', 'Ops', 'No passwords in the demo.', 'Reset demo'].every((t) => x.includes(t)); })());
  const t0 = Date.now();

  // 0:00 Pick exporter
  await click('Exporter');
  await p.waitForFunction(() => location.pathname === '/app', { polling: 50 });
  ok('role cookie routes to the exporter app', await waitText('Kaveri Textiles Pvt Ltd'));
  ok('dashboard has its four cards', await waitText('AVERAGE TIME TO FIRST OFFER') && (await text()).includes('TOTAL FINANCED') && (await text()).includes('PASSPORT TIER') && (await text()).includes('ACTIVE TRADES'));
  ok('dashboard shows Tier 2 and three seeded trades', await waitText('Tier 2', 3000) && await (async () => { const x = await text(); return ['CSH-2526-00212', 'CSH-2526-00298', 'CSH-2627-00077'].every((id) => x.includes(id)); })());
  await wait(800); await shot('02-dashboard'); await noSideways('dashboard');

  // Wizard
  await click('New trade');
  await waitClick('Scenario B');
  await wait(100);
  ok('summary fills in as you go', await waitText('USD 30,000 (₹25,50,000 @ 85.00)'));
  await click('Continue to documents');
  await waitClick('Use sample documents');
  await wait(SPEED ? 600 : 50);
  if (SPEED) ok('documents scan with a status', (await text()).includes('Reading this document'));
  await p.waitForFunction(() => { const b = [...document.querySelectorAll('button')].find((e) => e.innerText.trim() === 'Continue to verification'); return b && !b.disabled; }, { polling: 50, timeout: 30000 });
  ok('BL slot is amber, others extracted', (await text()).includes('1 field needs review') && (await text()).includes('12 fields extracted'));
  await shot('03-documents');
  await wait(50);
  await click('Continue to verification');
  await waitClick('Run verification');
  const started = Date.now();
  if (SPEED) { await wait(1500); await shot('04-running'); ok('rows run live, with a running state', (await text()).includes('Checking now.')); }
  ok('check 8 line is exact', await waitText('Invoice quantity 4,800 does not match Bill of Lading quantity 4,200.'));
  ok('summary strip is exact', await waitText('11 passed, 1 unknown, 1 failed, 1 pending', 30000));
  if (SPEED) { const s = (Date.now() - started) / 1000; ok('14-check run takes about 12 s', s > 9 && s < 15, s.toFixed(1) + ' s'); }
  await wait(300);
  await waitText('Upload corrected document', 1000);
  ok('wizard stays on step 3 until resolved', await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => e.innerText.trim() === 'Continue to review').disabled));
  ok('fix and flag options appear within a second', await waitText('Upload corrected document', 1000) && (await text()).includes('Continue and flag to lenders'));
  await noBan('verification');
  ok('check rows keep titles readable beside the summary', await p.evaluate(() => { const r = document.querySelector('.cq button'); return r && r.getBoundingClientRect().height < 110; }));
  await shot('05-check8-failed');

  // Evidence drawer on check 8
  await click('8. Documents agree'); await wait(300);
  const drawer = await p.evaluate(() => { const d = document.querySelector('[role=dialog]'); return { w: d.getBoundingClientRect().width, t: d.innerText, bad: [...d.querySelectorAll('td')].filter((c) => /fail-soft/.test(c.className)).map((c) => c.innerText) }; });
  ok('evidence drawer: 480px, comparison, mismatch highlighted', drawer.w === 480 && drawer.bad.some((x) => x.includes('4,800')));
  ok('name difference is a note, not a mismatch', drawer.t.includes('Buyer names matched after normalising.') && !drawer.t.includes('Buyer name "'));
  ok('interpretation line shown', drawer.t.includes('600 pcs were not shipped. The invoice may overstate the goods by USD 3,750.'));
  ok('check 8 is labelled Computed, with a reference hash', /Computed/.test(drawer.t) && /Evidence reference/i.test(drawer.t));
  await shot('06-evidence-drawer'); await p.screenshot({ path: path.join(OUT, '06b-drawer-view.png') });
  await p.keyboard.press('Escape'); await wait(250);
  await click('1. Business'); await wait(250);
  ok('staged check is labelled simulated, with raw evidence', await p.evaluate(() => { const t = document.querySelector('[role=dialog]').innerText; return t.includes('MCA (simulated)') && t.includes('"simulated": true'); }));
  await p.keyboard.press('Escape'); await wait(250);

  // Fix
  await click('Upload corrected document');
  await waitClick('Use the sample amended invoice');
  ok('re-run passes', await waitText('Documents now agree'));
  ok('value updates to the amended invoice', await waitText('USD 26,250 (₹22,31,250 @ 85.00)'));
  await click('8. Documents agree'); await wait(250);
  ok('partial shipment is info after the fix', (await text()).includes('Partial shipment, permitted by the PO.'));
  await p.keyboard.press('Escape'); await wait(250);

  await waitClick('Continue to review');
  ok('step 4 shows evidence and what stays open', await waitText('Lenders will see these as open') && (await text()).includes('Buyer has not yet confirmed') && (await text()).includes('Carrier tracking not yet available') && (await text()).includes('92.8 of 100'));
  const openBtnDisabled = await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => e.innerText.trim() === 'Open to lenders').disabled);
  ok('Open to lenders needs consent ticked', openBtnDisabled);
  ok('consent wording is exact', (await text()).includes('Share this trade and its evidence with lenders for 30 days. You can revoke at any time.'));
  await shot('07-consent');
  await p.evaluate(() => document.querySelector('input[type=checkbox]').click()); await wait(50);
  const opened = Date.now();
  await click('Open to lenders');
  await p.waitForFunction(() => location.search.includes('tab=offers'), { polling: 50 });
  if (SPEED) {
    ok('three waiting cards', await waitText('Waiting for Tidewater Finance…', 3000) && (await text()).includes('Waiting for Meridian Bank…'));
    await shot('08-waiting');
    ok('Tidewater toast arrives', await waitText('Offer received from Tidewater Finance.', 7000));
    const a = (Date.now() - opened) / 1000; ok('Tidewater at about 4 s', a > 3 && a < 6, a.toFixed(1));
    ok('Banyan arrives', await waitText('Offer received from Banyan Capital.', 7000));
    const c = (Date.now() - opened) / 1000; ok('Banyan at about 8 s', c > 7 && c < 10, c.toFixed(1));
    ok('Meridian arrives', await waitText('Offer received from Meridian Bank.', 7000));
    const d = (Date.now() - opened) / 1000; ok('Meridian at about 12 s', d > 11 && d < 14, d.toFixed(1));
  } else {
    await waitText('Effective annualised cost', 5000);
  }
  await p.waitForFunction(() => document.querySelectorAll('thead .text-h2').length === 3, { polling: 50, timeout: 20000 });
  await wait(600);
  const order = () => p.evaluate(() => [...document.querySelectorAll('thead .text-h2')].map((e) => e.innerText).join(' > '));
  ok('default order by effective cost', (await order()) === 'Meridian Bank > Banyan Capital > Tidewater Finance', await order());
  let t = await text();
  ok('numbers match Section 6.5', ['12.93%', '13.53%', '16.58%', '₹17,85,000', '₹18,96,562', '₹20,08,125', '₹17,73,844', '₹18,87,080', '₹19,76,511'].every((x) => t.includes(x)));
  ok('badges and ranking line', ['Lowest cost', 'Fastest', 'Most cash upfront', 'Offers are ranked by what they cost you, never by what lenders pay Cashew.'].every((x) => t.includes(x)));
  ok('row order follows 7.6', await p.evaluate(() => [...document.querySelectorAll('tbody th')].map((e) => e.innerText).join('|').startsWith('Advance %|Advance amount|Headline rate|Effective annualised cost|Total fees|Net cash to you|Disbursal time|Recourse|Collateral|Conditions|Valid until')));
  await shot('09-offers'); await noSideways('offers');
  await click('Hidden fee found'); await wait(80);
  ok('hidden fee chip explains +₹16,065', (await text()).includes('Stated in the conditions, not in the headline fees. +₹16,065'));
  await click('Show the calculation'); await wait(80);
  t = await text(); ok('calculation shows actual arithmetic', t.includes('× 365/90') && t.includes('₹16,065') && t.includes('Stated only in the conditions'));
  await shot('10-calculation');
  await click('Fastest'); await wait(1300); ok('sort fastest', (await order()).startsWith('Tidewater'), await order());
  await click('Most cash'); await wait(1300); ok('sort cash', (await order()).startsWith('Tidewater'));
  await click('Lowest cost'); await wait(1300);

  // Accept Tidewater
  await p.evaluate(() => { const offers = [...document.querySelectorAll('thead .text-h2')].map((e) => e.innerText); const i = offers.indexOf('Tidewater Finance'); [...document.querySelectorAll('button')].filter((e) => e.innerText.trim() === 'Accept this offer')[i].click(); });
  await wait(300);
  ok('accept modal shows terms', (await text()).includes('I have read and agree'));
  await p.evaluate(() => document.querySelector('[role=dialog] input[type=checkbox]').click()); await wait(50);
  await click('Sign with OTP'); await waitClick('Autofill');
  await wait(50); await shot('11-otp');
  await click('Sign contract');
  ok('moves to Financing tab', await waitText('Registry receipt', 5000));
  ok('receipt written after staged disbursal', await waitText('Recorded in the duplicate-financing registry.', 8000));
  ok('simulated message, with the exact net cash', await waitText('Simulated message', 3000) && await waitText('₹19,76,511 disbursed against INV KT/2627/0231', 3000));
  ok('financed status', (await text()).includes('Financed'));
  const toFinanced = (Date.now() - t0) / 1000;
  ok('Scenario B, landing to FINANCED, under four minutes', toFinanced < 240, toFinanced.toFixed(0) + ' s of script time');
  await wait(300); await shot('12-financed');
  const id = await p.evaluate(() => location.pathname.split('/').pop());
  for (const tab of ['Overview', 'Documents', 'Verification', 'Tracking', 'Activity']) { await click(tab, p, 'nav[aria-label="Trade sections"]'); await wait(250); await noSideways('workspace ' + tab); await shot('13-tab-' + tab.toLowerCase()); }
  t = await text(); ok('activity has audit events and consent artefacts', t.includes('Consent artefacts') && t.includes('contract.signed') && t.includes('ranking.computed'));
  await noBan('workspace');

  // Lender portal: sealed, consent, sliders
  const lenderTab = async (id) => { await api('session', { role: 'lender', lenderId: id }); };
  await lenderTab('lender_tidewater');
  await p.goto(BASE + '/lender', { waitUntil: 'networkidle2' });
  ok('winning lender sees it in Financed', await waitText('Financed (1)', 4000));
  await click('Financed (1)'); await wait(100); await shot('14-lender-inbox');
  await p.goto(`${BASE}/lender/trades/${id}`, { waitUntil: 'networkidle2' });
  ok('commit receipt with chain position', await waitText('Committed to the registry.', 4000) && (await text()).includes('Chain position 7'));
  await shot('15-lender-financed');
  await lenderTab('lender_banyan');
  await p.goto(`${BASE}/lender/trades/${id}`, { waitUntil: 'networkidle2' });
  await waitText('Evidence strength', 4000); await wait(600);
  t = await text();
  ok('another lender sees its own offer only', t.includes('Offer sent. You can’t see other lenders’ offers.') && !/Tidewater Finance|Meridian Bank/.test(t.replace(/Lender: [A-Za-z ]+/g, '')) );
  await noBan('lender review');
  const strength = () => p.evaluate(() => document.querySelector('[data-testid=strength]').innerText);
  const before = await strength();
  await p.evaluate(() => { const s = document.querySelector('input[aria-label="Weight for Buyer risk"]'); const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; set.call(s, '2'); s.dispatchEvent(new Event('input', { bubbles: true })); s.dispatchEvent(new Event('change', { bubbles: true })); });
  await wait(30);
  const after = await strength();
  ok('moving a slider changes the number immediately', before !== after, `${before} -> ${after}`);
  ok('chart drawn', await p.evaluate(() => document.querySelectorAll('.recharts-bar-rectangle').length === 4));
  await shot('16-lender-review'); await noSideways('lender review');
  ok('document table is readable in the narrow column', await p.evaluate(() => [...document.querySelectorAll('section.docs-detail td:first-of-type')].every((c) => c.getBoundingClientRect().width > 80)));
  await p.goto(BASE + '/lender/products', { waitUntil: 'networkidle2' }); await waitText('Edit', 3000); await shot('17-products');
  await click('Edit'); await wait(300); ok('product edit drawer opens', (await text()).includes('MINIMUM TICKET')); await p.keyboard.press('Escape'); await wait(250);

  // Registry
  await p.goto(BASE + '/registry', { waitUntil: 'networkidle2' });
  await waitClick('Verify chain');
  ok('verify chain passes', await waitText('Chain intact, 7 entries verified.', 4000));
  t = await text(); ok('registry masks lenders', t.includes('Lender #1') && !/Tidewater|Meridian/.test(await p.evaluate(() => document.querySelector('table').innerText)));
  const leak = await api('registry/entries'); ok('registry API has no lender names or ids', !/banyan|tidewater|meridian/i.test(JSON.stringify(leak)));
  await click('Anchor now'); await wait(300); ok('anchor is labelled simulated', (await text()).includes('published to an external anchor (simulated)'));
  await shot('18-registry'); await p.keyboard.press('Escape'); await wait(250);

  // Mobile, with desktop in a second tab
  await api('session', { role: 'exporter' });
  const desk = await b.newPage(); track(desk); await desk.setViewport({ width: 1280, height: 800 });
  await desk.goto(`${BASE}/app/trades/${id}`, { waitUntil: 'networkidle2' });
  await p.goto(BASE + '/app/m', { waitUntil: 'networkidle2' });
  await waitText('Goods delivered', 4000); await shot('19-mobile');
  const frame = await p.evaluate(() => { const r = document.querySelector('[lang]:not(html)').getBoundingClientRect(); return [r.width, r.height]; });
  ok('phone frame is 390 × 844', frame[0] === 390 && frame[1] === 844, frame.join('×'));
  await click('हिन्दी'); await wait(100); ok('Hindi toggle', (await text()).includes('माल पहुँच गया')); await shot('19b-mobile-hi');
  await click('English');
  await click('Capture'); await wait(100); await click('Use sample photo'); await wait(100); ok('capture is labelled simulated', (await text()).includes('Photo captured (simulated).'));
  await click('Alerts'); await wait(100); ok('alerts list offers and the milestone', (await text()).includes('Please confirm delivery'));
  await click('Home'); await wait(100);
  await click('Goods delivered');
  const tapped = Date.now();
  await desk.waitForFunction(() => [...document.querySelectorAll('li[aria-current=step] p')].some((e) => e.innerText.includes('Repaid')), { timeout: 3000, polling: 50 });
  const lag = Date.now() - tapped;
  ok('phone tap moves the desktop timeline within about a second', lag < 1500, lag + ' ms');
  await desk.close();

  // Ops
  await api('session', { role: 'ops' });
  await p.goto(BASE + '/ops', { waitUntil: 'networkidle2' });
  ok('low-confidence case is queued', await waitText('Low-confidence extraction', 3000));
  await shot('20-ops-queue');
  await click('Audit log'); await wait(1200); t = await text(); ok('audit log shows state changes', t.includes('trade.status.changed') && t.includes('registry.committed') && t.includes('shipment.advanced')); await shot('21-ops-audit');
  await click('Offer requests'); await wait(600); ok('eligibility decisions listed', (await text()).includes('Received the request'));
  await click('Events'); await wait(600); ok('webhook events listed', (await text()).includes('financing.disbursed'));
  await click('Health'); await wait(200); ok('health cards', (await text()).includes('Simulated, healthy') && (await text()).includes('Manual fallback available')); await shot('22-ops-health');

  // Scenario C through keys and the panel
  await api('session', { role: 'exporter' });
  await p.goto(BASE + '/app', { waitUntil: 'networkidle2' });
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('3');
  ok('key 3 switches to Scenario C', await waitText('Coimbatore Knit Studio LLP', 4000));
  await p.keyboard.press('d'); await wait(200);
  await shot('23-panel');
  ok('panel fits 1280×800', await p.evaluate(() => { const e = document.querySelector('section[aria-label="Demo controls"]'); return e.scrollHeight <= e.clientHeight; }));
  await click('Add duplicate attempt 1');
  await p.waitForFunction(() => location.pathname.includes('/trades/CSH'), { timeout: 5000, polling: 50 });
  ok('attempt 1 is blocked', await waitText('This invoice has already been financed through Cashew. Details are not shared.', 15000));
  ok('attempt 1 status is Blocked', await waitText('Blocked', 3000));
  await p.keyboard.press('Escape'); await wait(150);
  await click('12. Not financed'); await wait(300);
  t = await p.evaluate(() => document.querySelector('[role=dialog]').innerText);
  ok('attempt 1 drawer: fingerprints equal, no lender named', t.includes('The fingerprints are equal.') && t.includes('Details of the other lender are not shared.') && !/banyan/i.test(t));
  await shot('24-attempt1'); await p.screenshot({ path: path.join(OUT, '24b-attempt1-view.png') });
  await p.keyboard.press('Escape'); await wait(250);
  await p.keyboard.press('d'); await wait(150);
  await click('Add duplicate attempt 2');
  ok('attempt 2 flags possible duplicate', await waitText('Possible duplicate. Similarity 0.87', 15000));
  await wait(200); await p.keyboard.press('Escape'); await wait(150);
  await click('12. Not financed'); await wait(300);
  t = await p.evaluate(() => document.querySelector('[role=dialog]').innerText);
  ok('attempt 2 drawer: similarity breakdown', ['Distance 2', 'Within 2.7% of a financed invoice', 'Within 2 days', 'Overall similarity', '0.87'].every((x) => t.includes(x)) && !/banyan/i.test(t));
  await noBan('attempt 2 drawer');
  await p.screenshot({ path: path.join(OUT, '25-attempt2-view.png') });
  await click('Send to Ops review'); ok('sent to ops', await waitText('Sent to Ops review.', 3000));
  await p.keyboard.press('Escape'); await wait(250);

  await api('session', { role: 'ops' });
  await p.goto(BASE + '/ops', { waitUntil: 'networkidle2' });
  await waitClick('Possible duplicate'); await wait(600);
  const disabled = await p.evaluate(() => [...document.querySelectorAll('button')].find((e) => e.innerText.trim() === 'Confirm duplicate').disabled);
  ok('decision needs a note', disabled);
  await p.type('textarea', 'Same IRN, invoice number tweaked.'); await wait(50);
  await shot('26-ops-case');
  await click('Confirm duplicate');
  ok('ops decision recorded', await waitText('Recorded by Asha', 3000));

  // Commit block for the second lender
  await api('session', { role: 'lender', lenderId: 'lender_tidewater' });
  await p.goto(BASE + '/lender', { waitUntil: 'networkidle2' });
  await waitClick('Financed (1)'); await wait(100);
  await click('CSH-2627-00398');
  await waitClick('Commit financing');
  ok('commit is blocked with no lender identity', await waitText('Commit blocked by the registry.', 4000) && !/banyan/i.test(await p.evaluate(() => document.querySelector('main').innerText)));
  await shot('27-commit-blocked');
  await p.goto(BASE + '/registry', { waitUntil: 'networkidle2' });
  await waitClick('Sample: exact copy');
  ok('lender registry check: blocked', await waitText('Blocked: already financed.', 3000));
  await click('Sample: altered copy');
  ok('lender registry check: possible duplicate', await waitText('Overall similarity 0.87', 3000));
  await shot('28-registry-check');

  // Closing beat from Scenario C, with no refresh
  await api('session', { role: 'exporter' });
  await p.goto(BASE + '/app/passport', { waitUntil: 'networkidle2' });
  await waitText('Trade Passport', 3000);
  await p.keyboard.press('d'); await wait(150);
  await click('Advance to repayment');
  ok('Passport moves to Kaveri', await waitText('Kaveri Textiles Pvt Ltd', 5000));
  ok('Passport tier and trades recomputed', await p.waitForFunction(() => /TIER\n+Tier 3/.test(document.body.innerText) && /VERIFIED TRADES\n+4/.test(document.body.innerText), { timeout: 4000, polling: 50 }).then(() => true, () => false));
  await p.keyboard.press('Escape'); await wait(150);
  ok('the fast-forward leaves no pile of toasts', (await p.evaluate(() => document.querySelectorAll('[data-above-scrim] li').length)) <= 2);
  await click('Verify in your browser');
  ok('signature valid in the browser', await waitText('Signature valid', 3000));
  ok('says which method verified it', (await text()).includes('Checked with WebCrypto'));
  await shot('29-passport-valid');
  await p.evaluate(() => document.querySelector('[role=switch]:not(button)').click());
  ok('tamper toggle fails verification', await waitText('Signature invalid. Contents were changed.', 3000));
  await shot('30-passport-tampered');
  await p.evaluate(() => document.querySelector('[role=switch]:not(button)').click());
  ok('turning tamper off restores valid', await waitText('Signature valid', 3000));
  await click('Generate share link'); ok('share link creates a consent', await waitText('Share link created (simulated)', 3000));
  ok('consent appears in the credential', await p.evaluate(async () => { const r = await (await fetch('/api/passport/org_kaveri')).json(); return r.passport.consent?.recipient === 'Meridian Bank'; }));
  await wait(1300); await click('Verify in your browser'); ok('still verifies with the consent in it', await waitText('Signature valid', 3000));

  // Controls: notes, N, staged labels, reset, R
  await p.goto(BASE + '/app', { waitUntil: 'networkidle2' });
  await p.keyboard.press('d'); await wait(120);
  await p.evaluate(() => [...document.querySelectorAll('[role=switch]')].find((e) => e.innerText.includes('Presenter notes')).click()); await wait(120);
  ok('presenter notes show the line', (await text()).includes('Meet Kaveri Textiles. One invoice, ₹25 lakh'));
  ok('caption pushes content down, not over it', await p.evaluate(() => { const c = document.querySelector('[aria-label="Presenter notes"]').getBoundingClientRect(); const m = document.querySelector('aside').getBoundingClientRect(); return m.top >= c.bottom - 1; }));
  await shot('31-notes');
  await p.keyboard.press('Escape'); await wait(120);
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('n'); await wait(400);
  ok('N steps the script and navigates', (await text()).includes('Five documents in') && p.url().includes('/app/trades/new'));
  await p.keyboard.press('n'); await wait(150); ok('N moves to the next line', (await text()).includes('Fourteen checks'));
  await p.keyboard.press('d'); await wait(120);
  await p.evaluate(() => [...document.querySelectorAll('[role=switch]')].find((e) => e.innerText.includes('Presenter notes')).click()); await wait(100);
  await p.keyboard.press('Escape'); await wait(100);

  await p.goto(BASE + '/app', { waitUntil: 'networkidle2' });
  const trades0 = (await api('trades')).trades.filter((x) => !x.history).length;
  ok('there are trades to reset', trades0 > 0);
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('r'); await wait(300);
  ok('R asks to confirm', (await text()).includes('Reset the demo?'));
  await p.keyboard.press('Escape'); await wait(250);
  ok('Esc cancels the reset', (await api('trades')).trades.filter((x) => !x.history).length === trades0);
  await p.keyboard.press('r'); await wait(300);
  const r0 = Date.now();
  await click('Reset demo', p, '[role=dialog]');
  await p.waitForFunction(() => document.body.innerText.includes('Demo reset.'), { polling: 20, timeout: 2000 });
  const resetMs = Date.now() - r0;
  ok('reset under 1 s from the UI', resetMs < 1000, resetMs + ' ms');
  ok('reset restores seed', (await api('trades')).trades.filter((x) => !x.history).length === 0);
  await api('demo/speed', { factor: 1 });

  // Staged labels off, reset mid-run, tamper of the JSON mirror
  await api('demo/settings', { stagedLabels: false });
  await p.goto(BASE + '/app/trades/new', { waitUntil: 'networkidle2' });
  await waitClick('Scenario B'); await wait(50); await click('Continue to documents');
  await waitClick('Use sample documents');
  await p.waitForFunction(() => document.body.innerText.includes('Reading'), { polling: 50 });
  await api('demo/reset', {}); // Mid-demo reset, from another control.
  await p.waitForFunction(() => location.pathname === '/app', { timeout: 5000, polling: 50 }).catch(() => {});
  ok('a mid-demo reset recovers without a refresh', await waitText('Dashboard', 4000));
  await api('demo/settings', { stagedLabels: true });

  if (MIRROR) {
    await api('session', { role: 'ops' });
    await wait(500);
    const state = JSON.parse(fs.readFileSync(MIRROR, 'utf8'));
    state.registry[0].fingerprint = 'b' + state.registry[0].fingerprint.slice(1);
    fs.writeFileSync(MIRROR, JSON.stringify(state));
    await wait(1100);
    await p.goto(BASE + '/registry', { waitUntil: 'networkidle2' });
    await waitClick('Verify chain');
    ok('verify chain fails after one edit to the JSON mirror', await waitText('Chain broken at entry 1', 4000));
    await shot('32-chain-broken');
    await api('demo/reset', {});
    await p.goto(BASE + '/registry', { waitUntil: 'networkidle2' });
    await waitClick('Verify chain');
    ok('and passes again after a reset', await waitText('Chain intact, 6 entries verified.', 4000));
  }

  // Keyboard reach on the real screens
  for (const [role, route] of [['exporter', '/app'], ['exporter', '/app/trades/new'], ['exporter', '/app/passport'], ['exporter', '/app/m'], ['lender', '/lender'], ['lender', '/lender/products'], ['lender', '/registry'], ['ops', '/ops']]) {
    await api('session', { role, lenderId: 'lender_banyan' });
    await p.goto(BASE + route, { waitUntil: 'networkidle2' }); await wait(300);
    const total = await p.evaluate(() => [...document.querySelectorAll('button,a[href],input:not([tabindex="-1"]),select,textarea')].filter((e) => e.offsetParent && !e.disabled).length);
    const seen = new Set();
    await p.evaluate(() => document.activeElement.blur());
    for (let i = 0; i < total + 2; i++) { await p.keyboard.press('Tab'); seen.add(await p.evaluate(() => { const e = document.activeElement; if (!e.dataset.k) e.dataset.k = String(Math.random()); return e.dataset.k; })); }
    ok(`keyboard reaches every control on ${route}`, seen.size >= total, `${seen.size}/${total}`);
  }

  // Projector and phone
  await api('session', { role: 'exporter' });
  await p.setViewport({ width: 1920, height: 1080 });
  for (const route of ['/app', '/app/trades/new', '/app/passport', '/app/m']) { await p.goto(BASE + route, { waitUntil: 'networkidle2' }); await noSideways('projector ' + route); }
  await p.goto(BASE + '/app', { waitUntil: 'networkidle2' }); await wait(800); await shot('33-projector');
  await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  for (const route of ['/', '/app', '/app/trades/new', '/app/passport', '/app/m']) { await p.goto(BASE + route, { waitUntil: 'networkidle2' }); await noSideways('phone ' + route); }
  await p.setViewport({ width: 1280, height: 800 });

  await wait(200);
  ok('no console errors or warnings in the whole run', errors.length === 0, [...new Set(errors)].slice(0, 5).join(' | '));
  ok('no requests to external hosts', external.length === 0, external.slice(0, 3).join());
  await b.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
