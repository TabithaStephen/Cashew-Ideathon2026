# Cashew demo

Presentation-grade demo of **Cashew**, a neutral export-finance verification platform for Indian MSME exporters.
One offline Next.js 14 app. The UI looks like the real product; most backends are scripted and labelled "simulated".
Every person, company, number and identifier is fictional.

**Real code runs for:** cross-document matching (check 8), the 14-check runner, the risk profile with lender weight sliders,
effective-cost offer maths with hidden-fee detection, a SHA-256 hash-chained Ed25519-signed duplicate-financing registry with
fuzzy matching, a signed Ed25519 Trade Passport verified in the browser, the trade state machine and the audit log.

## Run it

```bash
npm install
npm run dev            # http://localhost:3000
```

Production (what to use on demo day):

```bash
npm run build && npm start
```

Tests (engines, state machine, API incl. a full Scenario B walk):

```bash
npm test
```

No network is needed at runtime: fonts are bundled in `public/fonts`, there is no CDN or analytics.

## Demo controls

Press **D** anywhere for the demo panel (scenario A/B/C, speed 0.5x/1x/2x/Instant, lender responses, buyer confirmation,
shipment, time, repayment, duplicate attempts, presenter notes, staged labels, reset).

| Key | Action |
|---|---|
| `D` | Toggle demo controls |
| `R` | Reset demo (asks to confirm) |
| `N` | Next presenter note (turns captions on, follows the run-of-show) |
| `1` `2` `3` | Switch to Scenario A / B / C |
| `Esc` | Close drawers, modals and the panel |

## Resetting

- "Reset demo" on the landing page, the demo panel, or `R`. Restores seed state in well under a second.
- State is mirrored to `.demo-state.json` (refresh- and restart-safe). Deleting that file and restarting also resets.
- Scenario C starts with Kaveri's Scenario B trade already financed (C follows B in the script), so the Passport moment works after C.

## Scenarios

| | What happens |
|---|---|
| A | Clean trade: KT/2627/0198, all documents agree |
| B | Main story: invoice says 4,800 pcs, Bill of Lading 4,200. Fix with the amended invoice; three offers; Tidewater's hidden FX fee |
| C | Duplicate: CKS/2627/0188 already financed. Exact copy blocked, altered copy flagged at 0.87 similarity |

## Map

- `lib/engines/` pure engines (crossdoc, verification, risk, registry, matching, passport, state)
- `lib/seed/` orgs, lenders/products, scenarios and per-document extraction JSON (`docs/*.json`)
- `lib/store.ts` in-memory store + JSON mirror; `lib/service.ts` domain operations; `lib/demo/` controls and run-of-show
- `app/api/` mock API (Section 12); `app/` screens; `components/` UI kit (see `/kit`)
- `PROGRESS.md` build tracker and decisions
