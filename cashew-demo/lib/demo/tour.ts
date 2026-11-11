// The guided demo: a script that runs on the real app. It presses the real buttons and calls the real API,
// so every number on screen comes from the same engines as a manual run. Numbers in the narration are Scenario B
// at seed values, and each run starts by resetting to that seed.

export interface TourContext {
  /** Navigates and waits for the address to change. */
  go: (path: string) => Promise<void>;
  api: (path: string, body?: unknown) => Promise<any>;
  /** Reads current state, so a step can tell if its action has already happened. */
  read: (path: string) => Promise<any>;
  as: (role: 'exporter' | 'ops' | 'lender', lenderId?: string) => Promise<void>;
  /** Points at a control, then presses it. Matches visible text or an aria-label. */
  press: (label: string, scope?: string) => Promise<void>;
  /** Waits until this text is on screen. */
  see: (text: string, ms?: number) => Promise<void>;
  until: (test: () => boolean, what: string, ms?: number) => Promise<void>;
  /** Points at an element and scrolls to it: a [data-tour] name, or the smallest element holding some text. */
  spot: (target: string) => Promise<void>;
  type: (selector: string, value: string) => Promise<void>;
  tick: (selector: string) => Promise<void>;
  tradeId?: string;
}

export interface TourStep {
  chapter: string;
  title: string;
  say: string;
  run: (c: TourContext) => Promise<void>;
}

const VERIFY = 'Verify once';
const LENDERS = 'Many lenders';
const TRANSACTION = 'The transaction';
const PASSPORT = 'Trade Passport';
const DUPLICATE = 'Double financing';

const tradeTab = async (c: TourContext, tab: string) => {
  if (location.pathname === `/app/trades/${c.tradeId}`) await c.press(tab, 'nav[aria-label="Trade sections"]');
  else await c.go(`/app/trades/${c.tradeId}?tab=${tab.toLowerCase()}`);
};

export const TOUR: TourStep[] = [
  {
    chapter: VERIFY,
    title: 'Meet the exporter',
    say: 'Kaveri Textiles in Tiruppur has shipped T-shirts to a UK buyer. The invoice is worth about ₹25 lakh, and the buyer pays in 90 days. Kaveri needs the cash now.',
    run: async (c) => {
      await c.api('demo/scenario', { id: 'B' });
      await c.as('exporter');
      await c.go('/app');
      await c.see('Kaveri Textiles Pvt Ltd');
      await c.see('PASSPORT TIER');
      await c.spot('PASSPORT TIER');
    },
  },
  {
    chapter: VERIFY,
    title: 'Start a trade',
    say: 'The exporter enters the buyer, goods and value once. Lenders never get asked for this again.',
    run: async (c) => {
      await c.go('/app/trades/new');
      await c.press('Scenario B');
      await c.see('USD 30,000 (₹25,50,000 @ 85.00)');
      await c.press('Continue to documents');
      await c.until(() => new URLSearchParams(location.search).has('trade'), 'the trade to be created');
      c.tradeId = new URLSearchParams(location.search).get('trade')!;
    },
  },
  {
    chapter: VERIFY,
    title: 'Five documents go in',
    say: 'Purchase order, invoice, packing list, shipping bill and bill of lading. Reading them is simulated here. A field the reader is unsure of turns amber for a person to review.',
    run: async (c) => {
      await c.press('Use sample documents');
      await c.see('1 field needs review', 30000);
      await c.until(() => [...document.querySelectorAll('button')].some((b) => b.innerText.trim() === 'Continue to verification' && !b.disabled), 'all five documents');
      await c.spot('1 field needs review');
    },
  },
  {
    chapter: VERIFY,
    title: 'Fourteen checks run',
    say: 'Each check runs against a source and answers pass, fail or unknown. Unknown is shown honestly, never rounded up. External sources are simulated. The document comparison is real code.',
    run: async (c) => {
      await c.press('Continue to verification');
      await c.press('Run verification');
      await c.see('11 passed, 1 unknown, 1 failed, 1 pending', 40000);
      await c.spot('11 passed, 1 unknown, 1 failed, 1 pending');
    },
  },
  {
    chapter: VERIFY,
    title: 'It catches a real mismatch',
    say: 'The invoice says 4,800 pieces. The bill of lading says 4,200. A lender would have advanced money against goods that never shipped. Notice the buyer’s name differs too, and that is correctly not flagged.',
    run: async (c) => {
      await c.press('8. Documents agree');
      await c.see('600 pcs were not shipped');
      await c.spot('4,800 pcs');
    },
  },
  {
    chapter: VERIFY,
    title: 'The exporter fixes it',
    say: 'Kaveri uploads a corrected invoice for 4,200 pieces. Only this check re-runs, and the old result stays on record. The trade is now worth ₹22,31,250, the value that actually shipped.',
    run: async (c) => {
      await c.press('Close');
      await c.press('Upload corrected document');
      await c.press('Use the sample amended invoice');
      await c.see('Documents now agree', 30000);
      await c.see('USD 26,250 (₹22,31,250 @ 85.00)');
      await c.spot('Documents now agree');
    },
  },
  {
    chapter: LENDERS,
    title: 'One consent, three lenders',
    say: 'Kaveri consents once, for 30 days, and can revoke at any time. Lenders see only trades shared with them, and open checks are shown to them as open.',
    run: async (c) => {
      await c.press('Continue to review');
      await c.see('Lenders will see these as open');
      await c.spot('strength');
      await c.tick('input[type=checkbox]');
      await c.press('Open to lenders');
      await c.until(() => location.search.includes('tab=offers'), 'the offers page');
    },
  },
  {
    chapter: LENDERS,
    title: 'Sealed offers arrive',
    say: 'Each lender responds without seeing the others. Lender responses are simulated. Cashew turns every offer into one comparable number: the effective annual cost, including all fees.',
    run: async (c) => {
      await c.until(() => document.querySelectorAll('[data-tour="offer-table"] thead .text-h2').length === 3, 'all three offers', 40000);
      await c.spot('offer-table');
    },
  },
  {
    chapter: LENDERS,
    title: 'A hidden fee is exposed',
    say: 'Tidewater has the lowest headline rate, 10.2%. But its conditions add a 0.8% FX spread, worth ₹16,065. Counting everything, it is the most expensive at 16.58%. Offers are ranked by what they cost the exporter, never by what lenders pay Cashew.',
    run: async (c) => {
      await c.press('Hidden fee found');
      await c.see('Stated in the conditions');
      await c.spot('Stated in the conditions');
      await c.press('Show the calculation');
      await c.see('Stated only in the conditions');
    },
  },
  {
    chapter: LENDERS,
    title: 'What a lender sees',
    say: 'Here is Banyan Capital’s view: the same evidence, and only its own offer. Each lender weighs the evidence its own way. Moving a slider recalculates the strength instantly. Cashew supplies evidence, the lender decides.',
    run: async (c) => {
      await c.as('lender', 'lender_banyan');
      await c.go(`/lender/trades/${c.tradeId}`);
      await c.see('Offer sent. You can’t see other lenders’ offers.', 15000);
      await c.spot('strength');
      await c.type('input[aria-label="Weight for Buyer risk"]', '2');
    },
  },
  {
    chapter: TRANSACTION,
    title: 'Step 1: the exporter chooses',
    say: 'Back to Kaveri, who picks Meridian Bank. It pays the least cash up front and is the slowest, but it costs the least: 12.93% a year. An advance of 80% is ₹17,85,000. The choice stays with the exporter.',
    run: async (c) => {
      await c.as('exporter');
      await c.go(`/app/trades/${c.tradeId}?tab=offers`);
      await c.until(() => document.querySelectorAll('[data-tour="offer-table"] thead .text-h2').length === 3, 'the offers');
      await c.spot('offer-table');
      const trade = await c.read(`trades/${c.tradeId}`);
      if (trade.signedAt) return;
      if (trade.acceptedOfferId) {
        await c.press('Continue to e-sign', '[data-tour="offer-table"]');
        return;
      }
      await c.press('Accept this offer', '[data-tour="offer-table"]');
      await c.see('I have read and agree');
      await c.spot('₹17,85,000');
    },
  },
  {
    chapter: TRANSACTION,
    title: 'Step 2: the contract is signed',
    say: 'Kaveri reads the terms, agrees and signs with a one-time password. In this demo the signature is simulated: no contract is signed.',
    run: async (c) => {
      const trade = await c.read(`trades/${c.tradeId}`);
      if (trade.signedAt) {
        await tradeTab(c, 'Financing');
        await c.see('How this transaction works', 15000);
        return;
      }
      if (!trade.acceptedOfferId) {
        await c.tick('[role=dialog] input[type=checkbox]');
        await c.press('Sign with OTP');
      }
      await c.press('Autofill');
      await c.press('Sign contract');
      await c.see('How this transaction works', 15000);
    },
  },
  {
    chapter: TRANSACTION,
    title: 'Step 3: the registry comes first',
    say: 'Before any money moves, the invoice’s fingerprint is checked against the shared registry and then written to it. From this moment no other lender on Cashew can finance this invoice. This part is real: real SHA-256 hashes on a signed chain.',
    run: async (c) => {
      await c.see('Recorded in the duplicate-financing registry.', 20000);
      await c.spot('Recorded in the duplicate-financing registry.');
    },
  },
  {
    chapter: TRANSACTION,
    title: 'Step 4: the lender pays the exporter',
    say: 'Meridian pays ₹17,73,844: the ₹17,85,000 advance minus ₹11,156 in fees. Kaveri has cash today instead of in 90 days, and gets a message to confirm it. The disbursal and message are simulated.',
    run: async (c) => {
      await c.see('Simulated message', 5000);
      await c.spot('flow');
    },
  },
  {
    chapter: TRANSACTION,
    title: 'The lender’s record',
    say: 'Meridian sees the same trade as financed, with its receipt and its position in the chain.',
    run: async (c) => {
      await c.as('lender', 'lender_meridian');
      await c.go(`/lender/trades/${c.tradeId}`);
      await c.see('Committed to the registry.', 15000);
      await c.spot('Committed to the registry.');
    },
  },
  {
    chapter: TRANSACTION,
    title: 'Anyone can check the chain',
    say: 'Every entry is linked to the one before it and signed, so changing any past entry breaks the chain. Lenders are masked: the registry never says who financed what. Pressing Verify recomputes every hash and signature.',
    run: async (c) => {
      await c.go('/registry');
      await c.press('Verify chain');
      await c.see('Chain intact', 10000);
      await c.spot('Chain intact');
    },
  },
  {
    chapter: TRANSACTION,
    title: 'Step 5: the goods move',
    say: 'As the shipment moves, the record updates. When the vessel sails, the shipment check that was Unknown becomes a Pass, with the earlier result kept on record. Tracking is simulated.',
    run: async (c) => {
      await c.as('exporter');
      await c.go(`/app/trades/${c.tradeId}?tab=tracking`);
      await c.see('Shipment tracking is simulated.', 15000);
      await c.api('demo/advance', { what: 'shipment' });
      await c.api('demo/advance', { what: 'shipment' });
      await c.see('Confirmed by Carrier', 5000);
      await c.spot('Confirmed by Carrier');
    },
  },
  {
    chapter: TRANSACTION,
    title: 'Delivery, confirmed on a phone',
    say: 'Small exporters run on their phones. One tap confirms delivery, and the desktop updates within a second. Hindi is available too.',
    run: async (c) => {
      await c.api('demo/advance', { what: 'shipment' });
      await c.go('/app/m');
      await c.press('Goods delivered');
      await c.see('Delivery confirmed', 5000);
    },
  },
  {
    chapter: TRANSACTION,
    title: 'Step 6: the buyer pays, and it settles',
    say: 'After 90 days the buyer pays the full ₹22,31,250. Meridian keeps ₹18,30,774, its advance plus interest. The remaining ₹4,00,476 goes to Kaveri. In total Kaveri receives ₹21,74,320, so the finance cost ₹56,930. The registry marks the invoice settled.',
    run: async (c) => {
      await c.api('demo/advance', { what: 'repaid' });
      await c.go(`/app/trades/${c.tradeId}?tab=financing`);
      await c.see('₹21,74,320', 15000);
      await c.spot('flow');
    },
  },
  {
    chapter: PASSPORT,
    title: 'A record Kaveri can take anywhere',
    say: 'This repaid trade moves Kaveri from 3 to 4 verified trades, and from Tier 2 to Tier 3. Its history becomes a signed credential. Any lender can verify it in a browser, without calling Cashew.',
    run: async (c) => {
      await c.go('/app/passport');
      await c.see('Tier 3', 15000);
      await c.press('Verify in your browser');
      await c.see('Signature valid', 5000);
      await c.spot('Signature valid');
    },
  },
  {
    chapter: PASSPORT,
    title: 'Change one number and it breaks',
    say: 'Claim 9 completed trades instead of 4, and the signature no longer matches. The forgery is caught on the spot.',
    run: async (c) => {
      await c.tick('input[role=switch]');
      await c.see('Signature invalid. Contents were changed.', 5000);
      await c.spot('Signature invalid. Contents were changed.');
    },
  },
  {
    chapter: DUPLICATE,
    title: 'Someone tries to finance it twice',
    say: 'A new scenario. Banyan has already financed this Coimbatore Knit Studio invoice, and an exact copy is submitted again. It is blocked, and the fingerprints match, but the exporter is never told who financed it.',
    run: async (c) => {
      await c.api('demo/scenario', { id: 'C' });
      await c.as('exporter');
      const attempt = await c.api('demo/advance', { what: 'duplicate-1' });
      c.tradeId = attempt.tradeId;
      await c.go(`/app/trades/${c.tradeId}?tab=verification`);
      await c.see('Details are not shared.', 40000);
      await c.press('12. Not financed');
      await c.see('The fingerprints are equal.');
      await c.spot('The fingerprints are equal.');
    },
  },
  {
    chapter: DUPLICATE,
    title: 'Even a tweaked copy is caught',
    say: 'Now the same invoice with a changed number, a slightly higher amount and a date moved by 2 days. The exact hash no longer matches, but fuzzy matching still scores it 0.87 similar. It goes to a person to review.',
    run: async (c) => {
      await c.press('Close');
      const attempt = await c.api('demo/advance', { what: 'duplicate-2' });
      c.tradeId = attempt.tradeId;
      await c.go(`/app/trades/${c.tradeId}?tab=verification`);
      await c.see('Similarity 0.87', 40000);
      await c.press('12. Not financed');
      await c.see('Overall similarity');
      await c.spot('Overall similarity');
      await c.press('Send to Ops review');
      await c.see('Sent to Ops review.');
    },
  },
  {
    chapter: DUPLICATE,
    title: 'A person decides, and it is logged',
    say: 'Asha in Ops reviews the case and has to give a reason. Every decision and every state change in this demo lands in the audit log.',
    run: async (c) => {
      await c.as('ops');
      await c.go('/ops');
      await c.press('Possible duplicate');
      await c.type('textarea', 'Same IRN, invoice number changed.');
      await c.press('Confirm duplicate');
      await c.see('Recorded by Asha', 5000);
      await c.press('Audit log', 'nav[aria-label="Ops sections"]');
      await c.see('ops.decision', 5000);
      await c.spot('ops.decision');
    },
  },
  {
    chapter: DUPLICATE,
    title: 'The lender is stopped too',
    say: 'Tidewater had already signed on this same invoice before Banyan’s financing landed. When it tries to commit, the registry refuses. Double financing stops here, and Banyan’s name stays private.',
    run: async (c) => {
      await c.as('lender', 'lender_tidewater');
      await c.go('/lender/trades/CSH-2627-00398');
      await c.press('Commit financing');
      await c.see('Commit blocked by the registry.', 5000);
      await c.spot('Commit blocked by the registry.');
    },
  },
  {
    chapter: 'The end',
    title: 'One verified trade. Many lenders.',
    say: 'Verified once, offered by many, ranked by true cost, protected from double financing, and turned into a record the exporter owns. Everything real is computed live. Everything simulated is labelled.',
    run: async (c) => {
      await c.go('/');
      await c.see('One verified trade. Many lenders.');
    },
  },
];

export const CHAPTERS = TOUR.map((s) => s.chapter).filter((chapter, i, all) => all.indexOf(chapter) === i);
