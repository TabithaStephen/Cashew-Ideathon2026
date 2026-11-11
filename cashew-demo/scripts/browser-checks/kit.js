const puppeteer = require('puppeteer-core');
const path = require('path');
const CH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const BASE = 'http://localhost:3111';
const OUT = process.argv[2];
const SAMPLE = process.argv[3];
const results = [];
const ok = (n, p, x = '') => { results.push(p); console.log(`${p ? 'PASS' : 'FAIL'}  ${n}${x ? '  ' + x : ''}`); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  const b = await puppeteer.launch({ executablePath: CH, headless: 'new', args: ['--disable-gpu'] });
  const ctx = b.defaultBrowserContext();
  await ctx.overridePermissions(BASE, ['clipboard-read', 'clipboard-write', 'clipboard-sanitized-write']);
  const p = await b.newPage();
  const errors = [], external = [];
  p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e)));
  p.on('request', (r) => { if (!r.url().startsWith(BASE) && !r.url().startsWith('data:')) external.push(r.url()); });
  const desk = { width: 1280, height: 800 }, proj = { width: 1920, height: 1080 };
  const phone = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
  const go = () => p.goto(BASE + '/kit', { waitUntil: 'networkidle0' });
  const click = async (t) => { const d = await p.evaluate((t) => { const e = [...document.querySelectorAll('button')].find((x) => x.innerText.trim().startsWith(t) && x.offsetParent !== null); if (e) { e.click(); return true; } return false; }, t); if (!d) throw new Error('no control ' + t); };
  const text = () => p.evaluate(() => document.body.innerText);
  const active = () => p.evaluate(() => (document.activeElement.getAttribute('aria-label') || document.activeElement.innerText || document.activeElement.tagName).trim());
  const over = () => p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  const dialogs = () => p.evaluate(() => document.querySelectorAll('[role=dialog]').length);

  for (const [n, vp] of [['desktop', desk], ['projector', proj], ['phone', phone]]) {
    await p.setViewport(vp); await go(); await wait(800);
    ok(`${n}: no sideways scroll`, (await over()) <= 0, String(await over()));
    await p.screenshot({ path: path.join(OUT, `kit-${n}.png`), fullPage: true });
  }

  // Phone
  await p.setViewport(phone); await go();
  const small = await p.evaluate(() => [...document.querySelectorAll('main button')].filter((e) => e.offsetParent).map((e) => ({ t: e.innerText.slice(0, 20), h: Math.round(e.getBoundingClientRect().height) })).filter((x) => x.h < 44));
  ok('phone: tap targets at least 44px', small.length === 0, JSON.stringify(small));
  ok('phone: ribbon fits', (await p.evaluate(() => { const r = document.querySelector('[role=note]'); return r.scrollWidth - r.clientWidth; })) <= 0);
  await click('Open drawer'); await wait(350);
  ok('phone: drawer fits the screen', (await p.evaluate(() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; })));
  await p.screenshot({ path: path.join(OUT, 'drawer-phone.png') });

  await p.setViewport(desk); await go();
  // Exact sizes
  const m = await p.evaluate(() => {
    const h = (t) => [...document.querySelectorAll('main button')].find((x) => x.innerText.trim() === t).getBoundingClientRect().height;
    const slot = [...document.querySelectorAll('main button')].find((x) => x.innerText.includes('Commercial Invoice')).getBoundingClientRect().height;
    const row = document.querySelector('[aria-expanded]').getBoundingClientRect().height;
    return { btn: h('Share with 3 lenders'), compact: h('Accept'), slot, row, ribbon: document.querySelector('[role=note]').getBoundingClientRect().height };
  });
  ok('sizes: button 44, compact 36, ribbon 24, slot at least 120, row at least 56', m.btn === 44 && m.compact === 36 && m.ribbon === 24 && m.slot >= 120 && m.row >= 56, JSON.stringify(m));
  const fonts = await p.evaluate(async () => { await document.fonts.ready; return { body: getComputedStyle(document.body).fontFamily, bg: getComputedStyle(document.body).backgroundColor, loaded: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family) }; });
  ok('Manifest paper and Archivo applied', fonts.bg === 'rgb(244, 242, 234)' && /archivo/i.test(fonts.loaded.join()), fonts.bg);
  ok('English loads no Indic fonts', !fonts.loaded.some((f) => /ukta/i.test(f)));
  const t0chips = await p.evaluate(() => document.querySelector('section[aria-labelledby=kit-2]').innerText);
  ok('all seven chip variants', ['Pass','Fail','Unknown','Pending','Running','Needs attention','Info'].every((w) => t0chips.includes(w)));
  const t0 = await text();
  ok('all five DocSlot states present', ['Drop a file here','Reading this document','12 fields extracted','2 fields need review'].every((w) => t0.includes(w)));

  // Keyboard: every button reachable by Tab
  const total = await p.evaluate(() => [...document.querySelectorAll('button,a[href]')].filter((e) => e.offsetParent && !e.disabled).length);
  const seen = new Set(); 
  await p.evaluate(() => { window.scrollTo(0,0); document.activeElement.blur(); });
  for (let i = 0; i < total + 3; i++) { await p.keyboard.press('Tab'); const id = await p.evaluate(() => { const e = document.activeElement; if (!e.dataset.k) e.dataset.k = String(Math.random()); return e.dataset.k; }); seen.add(id); }
  ok('keyboard: Tab reaches every enabled control', seen.size >= total, `${seen.size}/${total}`);
  const ring = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return s.outlineStyle + ' ' + s.outlineWidth; });
  ok('keyboard: focus ring visible', ring === 'solid 2px', ring);

  // CheckRow by keyboard
  await go();
  const rowState = () => p.evaluate(() => { const e = document.querySelector('[aria-expanded]'); return [e.getAttribute('aria-expanded'), document.getElementById(e.getAttribute('aria-controls')).hidden]; });
  ok('CheckRow starts collapsed', (await rowState())[0] === 'false' && (await rowState())[1]);
  await p.focus('[aria-expanded]'); await p.keyboard.press('Enter'); await wait(50);
  ok('CheckRow opens with Enter', (await rowState())[0] === 'true' && !(await rowState())[1]);
  await p.keyboard.press('Space'); await wait(50);
  ok('CheckRow closes with Space', (await rowState())[0] === 'false');
  ok('CheckRow expanded variant shown', (await text()).includes('600 pcs were not shipped'));

  // Drawer
  const focusBtn = async (t) => p.evaluate((t) => [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === t).focus(), t);
  await focusBtn('Open drawer'); await p.keyboard.press('Enter'); await wait(350);
  ok('Drawer opens, width 480', (await p.evaluate(() => document.querySelector('[role=dialog]').getBoundingClientRect().width)) === 480);
  ok('Drawer takes focus', (await active()) === 'Close', await active());
  const inside = [];
  for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); inside.push(await p.evaluate(() => !!document.activeElement.closest('[role=dialog]'))); }
  ok('Drawer traps Tab', inside.every(Boolean));
  await p.keyboard.down('Shift'); for (let i = 0; i < 8; i++) { await p.keyboard.press('Tab'); inside.push(await p.evaluate(() => !!document.activeElement.closest('[role=dialog]'))); } await p.keyboard.up('Shift');
  ok('Drawer traps Shift+Tab', inside.every(Boolean));
  // HashPill in drawer: toast above scrim, real clipboard
  await p.evaluate(() => document.querySelector('[role=dialog] button[aria-label^="Copy"]').focus()); await p.keyboard.press('Enter'); await wait(300);
  const top = await p.evaluate(() => { const li = document.querySelector('[data-above-scrim] li'); if (!li) return false; const r = li.getBoundingClientRect(); return li.contains(document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)); });
  ok('HashPill: toast "Copied" visible above the drawer', top && (await text()).includes('Copied'));
  ok('HashPill: copies the full hash', (await p.evaluate(() => navigator.clipboard.readText())) === SAMPLE);
  ok('HashPill: shows truncated form', (await text()).includes('7f3a91c2...c91e'));
  // Nested modal, Esc one at a time, focus return
  await p.evaluate(() => [...document.querySelectorAll('[role=dialog] button')].find((x) => x.innerText.trim() === 'Open modal on top').focus()); await p.keyboard.press('Enter'); await wait(350);
  ok('Modal on top of drawer', (await dialogs()) === 2);
  await p.keyboard.press('Escape'); await wait(350);
  ok('Esc closes only the top dialog', (await dialogs()) === 1);
  ok('focus returns to the nested opener', (await active()) === 'Open modal on top', await active());
  await p.keyboard.press('Escape'); await wait(350);
  ok('Esc closes drawer', (await dialogs()) === 0);
  ok('focus returns to Open drawer', (await active()) === 'Open drawer', await active());
  ok('scroll unlocked', (await p.evaluate(() => document.documentElement.style.overflow)) === '');
  await click('Open modal'); await wait(350);
  ok('Modal width 560 and centred', await p.evaluate(() => { const r = document.querySelector('[role=dialog]').getBoundingClientRect(); return r.width === 560 && Math.abs(r.left - (innerWidth - r.right)) <= 1; }));
  await p.screenshot({ path: path.join(OUT, 'modal-desktop.png') });
  await p.mouse.click(20, 500); await wait(350);
  ok('scrim click closes', (await dialogs()) === 0);

  // Toast stack
  await go(); await click('Stack of three'); await wait(300);
  ok('Toast stack of three, bottom-right', await p.evaluate(() => { const l = document.querySelectorAll('[data-above-scrim] li'); const r = l[l.length - 1].getBoundingClientRect(); return l.length === 3 && innerWidth - r.right === 16 && innerHeight - r.bottom === 16; }));
  await p.screenshot({ path: path.join(OUT, 'toast-desktop.png') });
  await wait(3300);
  ok('still there just under 4s', (await p.evaluate(() => document.querySelectorAll('[data-above-scrim] li').length)) === 3);
  await wait(1000);
  ok('gone after 4s', (await p.evaluate(() => document.querySelectorAll('[data-above-scrim] li').length)) === 0);
  await click('With action'); await wait(250);
  const li = await p.$('[data-above-scrim] li'); await li.hover(); await wait(4500);
  ok('hover holds a toast past 4s', (await p.evaluate(() => document.querySelectorAll('[data-above-scrim] li').length)) === 1);
  await p.evaluate(() => [...document.querySelectorAll('[data-above-scrim] button')][0].click()); await wait(300);
  ok('toast action runs', (await text()).includes('Offer restored'));

  // Button loading
  await go(); await click('Click to load'); await wait(100);
  const busy = await p.evaluate(() => { const e = [...document.querySelectorAll('button')].find((x) => x.innerText.trim() === 'Saving'); return e && e.getAttribute('aria-busy') === 'true' && !!e.querySelector('svg'); });
  ok('Button loading: spinner and aria-busy', busy);

  // DocSlot real file chooser
  const [chooser] = await Promise.all([p.waitForFileChooser(), p.evaluate(() => { const all = [...document.querySelectorAll('button')].filter((x) => x.innerText.includes('Commercial Invoice')); all[all.length - 1].click(); })]);
  await chooser.accept([process.argv[4]]); await wait(300);
  ok('DocSlot: file chooser leads to scanning', (await text()).includes('sample.pdf'));
  await wait(1700);
  ok('DocSlot: then extracted with replace', (await p.evaluate(() => [...document.querySelectorAll('button')].some((x) => x.innerText.trim() === 'Replace' && x.closest('[class*=pass-soft]')))));

  // Count-up
  await go(); const samples = [];
  await click('Replay count-up');
  for (let i = 0; i < 6; i++) { samples.push(await p.evaluate(() => document.querySelector('section[aria-labelledby=kit-3] [aria-hidden=true]').innerText)); await wait(60); }
  await wait(700);
  const fin = await p.evaluate(() => { const s = document.querySelector('section[aria-labelledby=kit-3]'); return [s.querySelector('[aria-hidden=true]').innerText, s.querySelector('.sr-only').innerText]; });
  ok('StatCard counts up and ends on the exact value', new Set(samples).size > 1 && fin[0] === '₹22,31,250' && fin[1] === '₹22,31,250', samples.slice(0,3).join(' ') + ' -> ' + fin[0]);

  // Reduced motion
  const rp = await b.newPage();
  await rp.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await rp.setViewport(desk);
  await rp.goto(BASE + '/kit', { waitUntil: 'networkidle0' });
  await wait(60);
  const rm = await rp.evaluate(() => ({ v: document.querySelector('section[aria-labelledby=kit-3] [aria-hidden=true]').innerText, scan: [...document.querySelectorAll('[class*=animate-scan-line]')].every((e) => getComputedStyle(e).display === 'none') }));
  ok('reduced motion: no count-up, no scan-line', rm.v === '₹22,31,250' && rm.scan, JSON.stringify(rm));
  await rp.close();

  // DemoPanel
  await go();
  await p.evaluate(() => document.activeElement.blur());
  await p.keyboard.press('d'); await wait(100);
  const pr = await p.evaluate(() => { const e = document.querySelector('section[aria-label="Demo controls"]'); if (!e) return null; const r = e.getBoundingClientRect(); return { w: r.width, l: r.left, b: innerHeight - r.bottom }; });
  ok('D opens panel: 320px, bottom-left', pr && pr.w === 320 && pr.l === 16 && pr.b === 16, JSON.stringify(pr));
  ok('panel takes focus', (await active()) === 'Close demo controls');
  await p.screenshot({ path: path.join(OUT, 'panel-desktop.png') });
  const t = await p.evaluate(() => document.querySelector('section[aria-label="Demo controls"]').innerText);
  ok('all 10.4 controls present', ['Lenders respond now','Buyer confirms','Advance shipment','Advance 30 days','Advance to repayment','Add duplicate attempt 1','Add duplicate attempt 2','Presenter notes','Show staged labels','Reset demo','Instant'].every((w) => t.includes(w)));
  ok('panel fits 800px height without clipping controls off-screen', await p.evaluate(() => { const e = document.querySelector('section[aria-label="Demo controls"]'); return e.getBoundingClientRect().top >= 24 && e.scrollHeight <= e.clientHeight; }));
  await p.evaluate(() => [...document.querySelectorAll('section[aria-label="Demo controls"] button')].find((x) => x.innerText.trim() === 'C').click()); await wait(50);
  ok('panel reports its action', (await text()).includes('"scenario":"C"'));
  await p.keyboard.press('Escape'); await wait(60);
  ok('Esc closes panel', !(await p.$('section[aria-label="Demo controls"]')));
  await p.keyboard.press('d'); await wait(60); await p.keyboard.press('d'); await wait(60);
  ok('D toggles closed', !(await p.$('section[aria-label="Demo controls"]')));
  await p.keyboard.down('Meta'); await p.keyboard.press('d'); await p.keyboard.up('Meta'); await wait(60);
  ok('Cmd+D does not open it', !(await p.$('section[aria-label="Demo controls"]')));
  // Panel with a drawer open: Esc closes drawer first
  await click('Open drawer'); await wait(300); await p.keyboard.press('d'); await wait(80);
  await p.keyboard.press('Escape'); await wait(300);
  ok('with drawer open, Esc closes the drawer before the panel', (await dialogs()) === 0 && !!(await p.$('section[aria-label="Demo controls"]')));

  ok('no console errors or warnings', errors.length === 0, errors.slice(0, 3).join(' | '));
  ok('no external requests', external.length === 0, external.slice(0, 3).join());
  await b.close();
  const failed = results.filter((r) => !r).length;
  console.log(`\n${results.length - failed}/${results.length} passed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('CRASH', e); process.exit(2); });
