# Cashew Demo — Progress Tracker

Source of truth: *Cashew Build Blueprint and Master Prompt (Demo Edition)* (Sections 1–15).
This file is the working summary; consult it before re-reading the blueprint.

## Key facts (cheat sheet)
- Stack: Next.js 14 App Router + TS, Tailwind, Framer Motion, lucide-react, Recharts, Zustand, Vitest. Offline (fonts bundled).
- FX fixed: USD 1 = ₹85.00. Demo today = real "today", seed dates are relative.
- Scenarios: A clean (KT/2627/0198, 3,000 pcs, USD 18,750) · B main (KT/2627/0231, 4,800 vs BL 4,200; amended → 4,200 / USD 26,250 = ₹22,31,250) · C duplicate (CKS/2627/0188 financed by Banyan; attempt 1 exact, attempt 2 altered ≈0.87).
- Offer fixtures (B, V=₹22,31,250, 90d): Banyan 13.53% / Tidewater 16.58% (hidden FX spread ₹16,065) / Meridian 12.93%. Default order Meridian, Banyan, Tidewater.
- Risk fixtures: A = 92.8 Strong; B pre-fix = 82.8 but blocking #8 → Limited.
- Never say "score" in lender-facing copy. No commission field anywhere.

## Phases
| Phase | Scope | Status |
|---|---|---|
| 0 | Scaffold, tokens, fonts, DemoRibbon, landing shell | ✅ |
| 1 | Component kit + `/kit` page | ✅ all 14 components, every state |
| 2 | Types, seed, store (+JSON mirror), state machine, audit, tests | ✅ |
| 3 | Engines: crossdoc, verification, risk, registry, matching, passport + tests | ✅ 21 tests green |
| 4 | Mock API (Section 12) + API tests + scripted Scenario B walk | ✅ 38 routes, 31 tests green |
| 5 | Exporter app (7.1–7.7) | ✅ Playwright: landing → FINANCED in 38 s at 2x |
| 6 | Lender portal (8) | ✅ inbox per lender, live sliders (Recharts), sealed offers, commit step, products edit drops Meridian |
| 7 | Registry explorer, Ops, Passport (9, 7.8) | ✅ C blocks/flags 0.87, chain verify 14, passport valid → tamper invalid (WebCrypto) |
| 8 | Mobile view (7.9) | ✅ phone tap → desktop timeline in ~0.4 s (BroadcastChannel + 1 s poll) |
| 9 | DemoPanel + choreography (10) | ✅ all controls idempotent, D/R/N/1-3/Esc, presenter captions for every run-of-show row |
| 10 | Hardening, README, checklist (14) | ✅ prod build, 5 Playwright flows clean, README |

## Decisions made (ambiguities resolved simply)
- **Fonts:** bundled woff2 in `public/fonts` declared via `@font-face` (with unicode-range so ₹ comes from Inter latin-ext). Equivalent to next/font/local, still zero runtime network.
- **shadcn/ui:** no CLI (offline-friendly); hand-written shadcn-style primitives in `components/` using `cn()` (clsx + tailwind-merge).
- **Timers are lazy:** verification runs, lender responses and the 2 s disbursal are stored as due-times and materialised by `tick()` on each API call. Refresh-safe and restart-safe.
- **Check 12 'warn':** `CheckResult` gains `'warn'` for POSSIBLE_DUPLICATE; it scores like Unknown (40%).
- **Registry fuzzy index:** fuzzy matching needs invoice no./amount/date, so a server-only `registryIndex` holds those (never returned by any API). The chain itself holds only hashes, status, timestamps.
- **Seeded registry:** 13 entries, so the Scenario B commit makes it 14 ("Chain intact, 14 entries verified").
- **Scenario C start state:** C follows B in the script, so resetting to C fast-forwards Kaveri's B trade to FINANCED (with whichever lender was accepted in B, default Meridian). This lets 4:40 "Advance to repayment → Passport" work after C.
- **Consent + minimum checks:** Unknown/Pending results are auto-flagged to lenders "as they are" when opening to lenders; Fails need the explicit "Continue and flag to lenders".
- **Lender commit:** happens automatically right after e-sign (staged lender action: registry check → commit), then 2 s disbursal. Lender portal shows the commit log and can re-run it.
- **Amended invoice:** uploaded explicitly via "Upload corrected document" (`amended=true`); re-uploading a slot otherwise just versions the same extraction.

- **Display rounding:** money is rounded half-to-even for display; this reproduces every 6.5 figure exactly (₹18,96,562, ₹4,462). Maths stays unrounded.
- **Sample-trade buttons:** A, B, C exact copy, C altered copy (C needs two). The scenario's own sample is highlighted.

## Log
- Engines + seed + store + service + demo controls written; vitest 21/21 passing (fixtures from 6.5, 11.2, 11.4 exact).
- Phase 4: 38 route handlers (Section 12 + helpers: flag, review field, milestone, products PATCH, ops events, demo state). API tests cover consent enforcement, sealed offers, no lender-identity leak, full Scenario B walk, Scenario C duplicates.
- Phases 0, 1, 5: tokens/fonts, component kit at `/kit`, landing, dashboard, trades list, 4-step wizard, workspace (7 tabs), evidence drawer, offers comparison, accept + OTP modal, SMS preview. Scenario B UI walk scripted with Playwright: no console errors.
- Phase 6: lender inbox/review/products; fixed `useApi` skipping fetches when the URL changes mid-flight (sliders now recompute instantly).
- Phase 7: registry explorer (verify chain, staged anchor), Ops queue/decisions/audit export/health+webhooks, Passport (share link, download, browser verify, tamper). Reset to C: 13 ms server-side.
- Phase 8: mobile phone frame (Home/Capture/Alerts, 14 EN/हिन्दी strings). Mutations broadcast a cross-tab refresh.
- Phase 9: "Advance to repayment" switches the exporter session to the repaid trade's org and opens the Passport (run-of-show 4:40 happens after the switch to C).
- Phase 10: production build green; all Playwright flows re-run against `next start` with 0 external requests and 0 console errors; JSON-mirror tamper → Verify chain fails at #4, reset → intact; reduced motion hides scan-line; 1920×1080 checked.
- Background polls use soft errors (`x-cashew-soft` header → 200 + error body) so role switches/resets never log 4xx in the console; direct API clients still get real status codes.

## Section 14 checklist status
**14.2 Functional**
- [x] Check 8 fails with the exact line (API test + UI)
- [x] Amended invoice re-run passes; partial shipment shown as a note
- [x] "Limited" vs "LTD." not a mismatch (note shown)
- [x] Offers on 4/8/12 s timers (× speed), numbers match 6.5 exactly
- [x] Hidden fee chip on Tidewater; calculation shows ₹16,065
- [x] Default order Meridian, Banyan, Tidewater
- [x] Weight sliders change strength immediately
- [x] C attempt 1 blocks without lender identity; attempt 2 ≈0.87
- [x] Verify chain passes clean, fails after editing the JSON mirror
- [x] Passport verifies in browser (WebCrypto, tweetnacl fallback); tamper fails
- [x] Every state change in the audit log (API test asserts the action list)
- [x] Reset < 1 s (5–13 ms server-side)

**14.3 Visual / UX**
- [x] Tokens only in `app/tokens.css` (favicon SVG is the one static asset with literal colours)
- [x] Indian grouping; export values show both currencies + rate
- [x] Tabular figures; hashes in mono pill with copy + toast
- [x] Focus rings; keyboard reachable; icon + label on every chip
- [x] Reduced motion removes scan-line/slide-ins/count-ups
- [x] 1280×800, 1920×1080, 390×844 phone frame
- [x] No console errors in scripted runs (dev and prod)
- [x] Works offline (0 non-localhost requests)

## Known limits / ideas not built (non-goals respected)
- Phone frame (868px tall) needs a scroll at 1280×800 viewports.
- "Average time to first offer" reflects the latest trade only (Scenario C's carried-over trade shows 0 s because it was fast-forwarded).
