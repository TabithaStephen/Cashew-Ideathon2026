# Cashew demo

A presentation demo of a neutral export-finance verification platform for Indian MSME exporters. It runs on one computer with no internet. Every person, company and number is fictional.

## Run it

```
npm install
npm run dev                 # for working on it
npm run build && npm start  # for the presentation
```

Open http://localhost:3000 and pick a role. There are no passwords.

`npm test` runs the unit and API tests.

## Reset

- Press **R**, then confirm.
- Or open the demo controls (**D**) and choose **Reset demo**.
- Or use **Reset demo** on the landing page.

Reset restores the seed data for the current scenario in under a second. State is mirrored to `.demo-state.json`, so a refresh or restart doesn't lose the scenario. Delete that file while the app is stopped to start from Scenario B.

## Guided demo

Open `/demo`, or use **Watch the guided demo** on the landing page, then **Start the demo**. It takes about 5 minutes at normal speed. Cashew plays itself on the real screens with a narration bar: 26 steps across verification, offers, the transaction, the Passport and double financing. It resets the demo data when it starts and when you exit.

While it plays, **P** pauses and the **right arrow** goes to the next step. Clicks on the page are blocked while it plays, so a stray click can't derail it; choose Exit to click around. Refreshing the page ends it. It has no Back button: use Restart. The script is `lib/demo/tour.ts`.

## Keyboard shortcuts

| Key | What it does |
|---|---|
| D | Open or close the demo controls |
| G | Open the guided demo |
| R | Reset, with a confirmation |
| N | Next step in the run of show (shows its line when presenter notes are on) |
| 1, 2, 3 | Switch to Scenario A, B or C |
| Esc | Close the top drawer, modal or the demo controls |

## Scenarios

- **A, clean trade:** the fast happy path, as a backup.
- **B, inconsistent trade:** the main story. Check 8 fails, the exporter fixes it, and the offers include a hidden fee.
- **C, duplicate attempt:** the registry blocks an exact copy and flags an altered one. A second lender's Commit is also blocked (log in as Tidewater Finance).

The default is B. Pressing **Advance to repayment** in Scenario C loads Kaveri Textiles with its trade repaid, which is the Passport close of the five-minute script.

## Other pages

- `/kit` shows every component in every state.
- `/proto` is the earlier prototype, on its own sample data.

## What's real and what's staged

**Real code:** cross-document matching (check 8), the risk profile and lender weights, offer maths and hidden-fee detection, SHA-256 fingerprints with a hash-chained, Ed25519-signed registry and fuzzy matching, the signed Passport verified in the browser, the trade state machine, consent and sealed-offer rules, and the audit log.

**Staged, and labelled as such:** document reading (fields come from `lib/seed/docs`), every external source, lender responses, OTP e-sign, disbursal, SMS, shipment tracking and external anchoring.

## Rehearsing the tamper checks

To see **Verify chain** fail, change one character of a `fingerprint` under `registry` in `.demo-state.json` while the app runs, wait a second, then press Verify chain on `/registry`. Reset afterwards.

## Browser checks

`scripts/browser-checks/` drives the production build in Chrome. It needs Chrome installed and `npm i --no-save puppeteer-core`, with the app on port 3111 (`npx next start -p 3111`). These change demo state, so don't run them against a session you're using. Run from that folder, with an existing empty folder for screenshots:

```
node run.js <shots> 1 <path to .demo-state.json>   # whole demo at 1x; use 0 for Instant
node kit.js <shots> 7f3a91c2d04e8b6a15f7c3e9a2d06b4f8e1c7a93b5d2064fe8a1c37b90d2c91e "$PWD/sample.pdf"
node e2e.js <shots>                                # /proto
node tour.js <shots> 1                             # guided demo at 1x; use 0 for Instant
```

## Where things are

- `lib/engines/`: the real logic, as pure modules
- `lib/services.ts`: every change to demo state
- `lib/api/router.ts`: the mock API, served by `app/api/[...path]/route.ts`
- `lib/seed/`: scenarios and sample documents. `scripts/gen-seed.mjs` regenerated the documents and isn't needed at runtime
- `lib/demo/controls.ts`: the run of show and presenter notes
- `components/`: the component kit, with app-level pieces in `components/app/`
- `app/tokens.css`: design tokens, and the only file allowed raw colours
