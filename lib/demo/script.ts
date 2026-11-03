// Run of show (Blueprint 10.1), used for presenter-note captions and the N shortcut.
export interface ShowStep { time: string; screen: string; action: string; say: string; claim?: number; href?: string }
export const RUN_OF_SHOW: ShowStep[] = [
  { time: '0:00', screen: 'Landing', action: 'Pick Exporter', say: 'Meet Kaveri Textiles. One invoice, ₹25 lakh, waiting 90 days to be paid.', href: '/' },
  { time: '0:20', screen: 'Wizard, step 2', action: 'Click "Use sample documents" (Scenario B)', say: 'Five documents in. We read them in seconds.', claim: 1, href: '/app/trades/new' },
  { time: '0:50', screen: 'Wizard, step 3', action: 'Run verification', say: 'Fourteen checks, each against a source. Each result is pass, fail or unknown.', claim: 1 },
  { time: '1:20', screen: 'Check 8', action: 'Open drawer', say: 'Invoice says 4,800 pieces. The Bill of Lading says 4,200. A lender would have financed goods that never shipped.', claim: 1 },
  { time: '1:50', screen: 'Upload amended invoice', action: 'Re-run check 8', say: 'Fixed in a minute. The result is an evidence bundle, not a score.', claim: 1 },
  { time: '2:15', screen: 'Step 4', action: 'Consent, "Open to lenders"', say: 'She consents once. Three lenders see the same verified trade.', claim: 2 },
  { time: '2:30', screen: 'Offers tab', action: 'Offers arrive', say: 'Sealed offers, normalised into one comparison.', claim: 2 },
  { time: '3:00', screen: 'Hidden fee', action: 'Click Tidewater chip, "Show the calculation"', say: 'Lowest headline rate, highest real cost. A fee in the small print. We rank by what it costs the SME, never by commission.', claim: 2 },
  { time: '3:30', screen: 'Accept, e-sign, financed', action: 'Autofill OTP', say: 'Accept, sign, funded. And the invoice is now in the shared registry.', claim: 2 },
  { time: '3:50', screen: 'Switch to Scenario C', action: 'Reset-to-C from DemoPanel, exporter runs check 12', say: 'Now someone tries to finance the same invoice with another lender.', claim: 3 },
  { time: '4:15', screen: 'Check 12', action: 'Exact copy blocked, then altered copy flagged', say: 'Blocked, without revealing who financed it. Even a tweaked copy is caught.', claim: 3 },
  { time: '4:40', screen: 'Passport', action: 'Advance time to repaid, open Passport, Verify, then Tamper toggle', say: 'After repayment, her history becomes a signed credential a lender can verify in the browser. Change one number and it breaks.', claim: 4, href: '/app/passport' },
  { time: '5:00', screen: 'End', action: '', say: 'One verified trade. Many lenders. Cashew.' },
];
