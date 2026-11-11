// The five-minute run of show (Blueprint 10.1). Presenter notes and the N key step through this.
export interface DemoStep {
  time: string;
  screen: string;
  action: string;
  say: string;
  /** Where N takes the presenter, if this step starts on another screen. */
  path?: string;
}

export const RUN_OF_SHOW: DemoStep[] = [
  { time: '0:00', screen: 'Landing', action: 'Pick Exporter', say: 'Meet Kaveri Textiles. One invoice, ₹25 lakh, waiting 90 days to be paid.', path: '/' },
  { time: '0:20', screen: 'Wizard, step 2', action: 'Click "Use sample documents"', say: 'Five documents in. We read them in seconds.', path: '/app/trades/new' },
  { time: '0:50', screen: 'Wizard, step 3', action: 'Run verification', say: 'Fourteen checks, each against a source. Each result is pass, fail or unknown.' },
  { time: '1:20', screen: 'Check 8', action: 'Open the drawer', say: 'Invoice says 4,800 pieces. The Bill of Lading says 4,200. A lender would have financed goods that never shipped.' },
  { time: '1:50', screen: 'Amended invoice', action: 'Upload it and re-run check 8', say: 'Fixed in a minute. The result is an evidence bundle, not a score.' },
  { time: '2:15', screen: 'Step 4', action: 'Consent, "Open to lenders"', say: 'She consents once. Three lenders see the same verified trade.' },
  { time: '2:30', screen: 'Offers tab', action: 'Offers arrive', say: 'Sealed offers, normalised into one comparison.' },
  { time: '3:00', screen: 'Hidden fee', action: 'Click the Tidewater chip, "Show the calculation"', say: 'Lowest headline rate, highest real cost. A fee in the small print. We rank by what it costs the SME, never by commission.' },
  { time: '3:30', screen: 'Accept, e-sign, financed', action: 'Autofill the OTP', say: 'Accept, sign, funded. And the invoice is now in the shared registry.' },
  { time: '3:50', screen: 'Scenario C', action: 'Press 3, then "Add duplicate attempt 1"', say: 'Now someone tries to finance the same invoice with another lender.' },
  { time: '4:15', screen: 'Check 12', action: 'Exact copy blocked, then "Add duplicate attempt 2"', say: 'Blocked, without revealing who financed it. Even a tweaked copy is caught.' },
  { time: '4:40', screen: 'Passport', action: '"Advance to repayment", Verify, then the Tamper toggle', say: 'After repayment, her history becomes a signed credential a lender can verify in the browser. Change one number and it breaks.', path: '/app/passport' },
  { time: '5:00', screen: 'End', action: 'Close', say: 'One verified trade. Many lenders.' },
];
