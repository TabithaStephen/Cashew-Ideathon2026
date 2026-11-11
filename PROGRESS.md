# Cashew: progress

Read this first for current status. Open the full docs only for the section you need.

## Current status (4 Nov 2026)

- **Blueprint Phases 0 to 10:** built and rehearsed. The user lifted the wait between phases.
- **Research brief, Steps 1 to 4:** done. Prototype at `/proto`.
- **Identity:** Manifest, for the whole app.
- **Guided demo mode:** done, at `/demo` (`lib/demo/tour.ts`, `components/app/GuidedDemo.tsx`), with a "How this transaction works" view on the trade's Financing tab and the lender's trade page (`components/app/TransactionFlow.tsx`).
- **Still needs people:** see "Before presenting".

## Run it

```
cd cashew-demo
npm run build && npm start   # http://localhost:3000
npm test                     # unit and API tests
```

Details, shortcuts and reset are in `cashew-demo/README.md`.

## Source documents

| What | Where |
|---|---|
| Blueprint Sections 1 to 5 (PDF; no PDF tools here, extract with Swift PDFKit) | `~/Downloads/Cashew Build Blueprint and Master Prompt (Demo Edition) (1).pdf` |
| Blueprint Sections 6 to 15 | `~/Downloads/Cashew_Build_Blueprint_Sections_6-15.md` |
| Technical Master | `~/Downloads/Cashew_Technical_Master.md` |
| Founders' Handbook | `~/Downloads/Cashew_Founders_Handbook.md` |
| Competitor research, feature matrix, Manifest identity | `docs/competitor-ui-research-and-design-direction.md` |

## Blueprint phases

- [x] 0. Scaffold and tokens
- [x] 1. Component kit (`/kit`)
- [x] 2. Types, seed, store, state machine, audit
- [x] 3. Engines
- [x] 4. Mock API
- [x] 5. Exporter app
- [x] 6. Lender portal
- [x] 7. Registry, Ops, Passport
- [x] 8. Mobile view
- [x] 9. Demo controls
- [x] 10. Hardening and rehearsal

## Verification (last run 4 Nov 2026)

- 100 unit and API tests. The build compiles with outbound network blocked.
- Whole demo driven through the UI (`scripts/browser-checks/run.js`), with server and browser network-blocked: Instant 124/124 twice, 1x 134/134.
- Earlier, on an earlier version of the script, online: Instant 116/116, three 1x runs. Two passed 126/126. One failed one check (fix-and-flag options read 300 ms after the summary, while the status polls every 500 ms). The script now allows a second, and it hasn't recurred.
- Kit 53/53, prototype 73/73.

- Guided demo (`scripts/browser-checks/tour.js`): 26 steps at Instant and 1x. It took about 5 minutes at 1x. `RECOVER=1` recreates a contract signed before the demo's turn. Not run with the network blocked.
- Guided demo blocks real clicks and Esc, Enter and Space on the page while it plays, after a click during a reading pause stopped it at step 12 on 4 Nov. Two tabs share one server state, so run it in one tab.

**Not tested:** a real projector, Wi-Fi physically off, screen readers, a real phone, drag-and-drop onto a DocSlot (the file picker is tested), reduced motion outside `/kit`, a human presenter timing the five minutes.

A bug only 1x found: the run loop stopped after the first finished check, so verification hung at normal speed. Instant hid it. Unit tests now cover 1x, so **rehearse at 1x, not only Instant**.

## Decisions where the blueprint was silent or conflicted

- **Manifest replaces Section 5.** Tokens in `app/tokens.css`. Button 44px (compact 36px on desktop, 44px on phones), 2px radius, no shadows, yellow only for the primary action and current step, ink ribbon with a shorter line on phones, no cashew drawing in EmptyState, motion 120 to 180ms. Blueprint 14.3's "match Section 5" means "match Manifest".
- **Count-up:** Phase 1 requires it and Manifest bans it, so it's an opt-in StatCard prop. Used on Total financed only.
- **Registry privacy:** 11.4 says the registry stores only hashes, but fuzzy matching needs invoice number, amount and date. They're kept in a private index (`registryIndex`) outside the chain, which the API never returns. A real product needs a better answer.
- **Check 12 exact match is a hard block** (REJECTED_VERIFICATION), with no "continue and flag". Flagging applies to check 8.
- **Possible duplicate** counts as Unknown in the risk rules, shows in warn colours, and can only be resolved by Ops.
- **Lender Commit block (9.2):** Scenario C seeds a second trade on the same invoice, signed with Tidewater before Banyan's commit landed. Log in as Tidewater to see it.
- **Normal commits happen automatically** after the 2 s staged disbursal, so the exporter sees the receipt straight away (7.7). The lender's Commit step (8.3) shows that receipt.
- **Passport close (10.1):** Scenario C resets Kaveri's trade, so "Advance to repayment" in C loads B and runs its trade to repaid, through the real functions, accepting the lowest-cost offer.
- **Pending check 14 at consent:** every check that hasn't passed is listed and flagged to lenders when the exporter consents, which meets the 11.7 rule.
- **Sealed offers:** lenders never see other lenders' offers, even after acceptance. Stricter than 11.5.
- **Uploaded files** are hashed and named, not stored. Extraction is seeded.
- **API:** one catch-all handler (`app/api/[...path]`, `lib/api/router.ts`) serves the Section 12 paths. Additions: `trades/:id/flag`, `ops-review`, `milestones`, `decline`, `audit`; `ops/events`, `ops/matching`; `lender/products`; `buyers`; `demo/state`, `demo/settings`.
- **Timed events** are due-times checked on each request, not background timers, so a refresh loses nothing.
- **Offer table on phones** scrolls inside its panel. The phone story is the frame at `/app/m`; `/proto` has the card layout if wanted later.
- **Presenter line** "not a score" is kept from 10.1: it's speech, not lender-facing copy.

- **Settlement split:** the blueprint has no settlement rule. `settlement()` in `matching.ts` assumes the buyer pays the full invoice, the lender keeps advance plus interest, and the rest goes to the exporter. Labelled on screen, and worth checking against how the lenders you pitch to actually settle.
- **Guided demo order:** it does the Passport before Scenario C, because switching scenario resets Kaveri. It accepts Meridian (lowest cost), so its disbursal is ₹17,73,844. The manual script's message example uses Tidewater's ₹19,76,511.
- **Stopping servers:** use `lsof -nP -iTCP:<port> -sTCP:LISTEN -t`. Plain `lsof -ti:<port>` also lists browsers connected to that port, and killing those hits the user's Chrome.

## Before presenting

- Rehearse aloud at 1x, on the real projector, with Wi-Fi off.
- Hindi strings (`/app/m`) and Hindi and Tamil strings (`/proto`) are drafts and need native review. Result sentences stay in English.
- Contour is not dead: acquired by XDC Ventures, Oct 2025.
- "TReDS is domestic" is too absolute: RXIL and M1xchange (M1 NXT) both claim cross-border offerings.
- KredX is now an RBI-licensed TReDS platform.
- Competitor post-login screens, app store listings and demo videos are NOT VERIFIED. Lendingkart and HDFC blocked automated capture.
- Replace blueprint "exporter" claims about what competitors lack with interview evidence.

## Notes

- ₹ exists only in each font's latin-ext file, so each font is two stacked faces with `adjustFontFallback: false`.
- Rounded offer lines can differ from a total by ₹1 (Tidewater: lines sum to ₹82,120, exact total ₹82,119). The blueprint's figures are right, and the calculation view says so.
- Store state is on `globalThis` because Next.js can load a module more than once.
- Not a git repository, and nothing has been committed.
