// Core types (Blueprint Section 13.1, with the few extra fields the demo needs).
// There is intentionally no commission field anywhere in this file.

export type Role = 'exporter' | 'lender' | 'ops';
export type ScenarioId = 'A' | 'B' | 'C';
export type DocSetId = 'A' | 'B' | 'C1' | 'C2';
export type DocType = 'po' | 'invoice' | 'packing' | 'shippingBill' | 'bl';
export type CheckResult = 'pass' | 'fail' | 'unknown' | 'pending';

export type TradeStatus =
  | 'DRAFT' | 'SUBMITTED' | 'VERIFYING' | 'NEEDS_INFO' | 'VERIFIED' | 'OFFERS_OPEN' | 'OFFER_ACCEPTED'
  | 'CONTRACT_SIGNED' | 'FINANCED' | 'SHIPMENT_IN_TRANSIT' | 'DELIVERED' | 'BUYER_ACCEPTED' | 'REPAID' | 'CLOSED'
  | 'REJECTED_VERIFICATION' | 'WITHDRAWN' | 'DISPUTED' | 'DEFAULTED';

export interface Org {
  id: string;
  type: 'sme' | 'lender';
  legalName: string;
  gstin?: string;
  iec?: string;
  udyam?: string;
  tier?: 0 | 1 | 2 | 3;
  city?: string;
  kind?: string;
}

export interface Buyer {
  id: string;
  name: string;
  country: string;
  registrationId: string;
}

export interface Field {
  value: string | number | boolean;
  confidence: number;
  unit?: string;
  currency?: string;
}
export type ExtractedFields = Record<string, Field>;

export interface Doc {
  id: string;
  tradeId: string;
  type: DocType;
  sha256: string;
  fileName: string;
  extracted: ExtractedFields;
  pdf: string;
  verifiedStatus: CheckResult;
  version: number;
  uploadedAt: string;
}

export interface Trade {
  id: string;
  smeId: string;
  buyerId: string;
  corridor: string;
  buyerCountry: string;
  sector: string;
  goods: string;
  hsCode: string;
  value: number; // in `currency`
  currency: string;
  fx: number;
  incoterm: string;
  paymentTermsDays: number;
  status: TradeStatus;
  scenario: ScenarioId;
  docSet: DocSetId;
  flaggedUnknownOrFailed: number[];
  createdAt: string;
  updatedAt: string;
  invoiceNo?: string;
  buyerConfirmed: boolean;
  shipmentStage: number; // 0 none, 1 Loaded, 2 Sailed, 3 Arrived, 4 Delivered
  shipmentLog: Array<{ stage: number; at: string; by: string }>;
  acceptedOfferId?: string;
  signedAt?: string;
  disbursalDueAt?: number;
  commit?: RegistryReceipt;
  commitBlocked?: boolean;
  deliveredOnTime?: boolean;
  repaidOnTime?: boolean;
  repaidAt?: string;
  history?: boolean;
  attempt?: 1 | 2;
  seededRace?: boolean;
  eligibility?: EligibilityDecision[];
}

export interface VerificationCheck {
  id: string;
  tradeId: string;
  checkId: number;
  result: CheckResult;
  /** An unresolved "possible duplicate" stays Unknown for the risk rules but shows in warn colours. */
  flag?: 'possible-duplicate';
  line: string;
  source: string;
  mode: 'staged' | 'real';
  evidence: unknown;
  evidenceHash: string;
  runAt: string;
  durationMs: number;
}

export interface VerificationRun {
  id: string;
  tradeId: string;
  plan: Array<{ checkId: number; startAt: number; dueAt: number; done: boolean; durationMs: number }>;
  finished: boolean;
}

export interface RiskProfile {
  tradeId: string;
  strength: number;
  band: 'Strong' | 'Moderate' | 'Limited';
  riskBand: 'Low' | 'Medium' | 'High';
  components: Record<RiskComponent, number>; // 0 to 100
  blocking: number[];
  weights: number[];
  ruleVersion: string;
  computedAt: string;
}
export type RiskComponent = 'Entity health' | 'Transaction authenticity' | 'Buyer risk' | 'Structure';

export interface Fee {
  label: string;
  kind: 'pctAdvance' | 'flat' | 'pctInvoice';
  value: number; // percent for pct kinds, rupees for flat
  statedIn: 'headline' | 'conditions';
}

export interface OfferPricing {
  advancePct: number;
  ratePct: number;
  fees: Fee[];
  recourse: boolean;
  recourseNote?: string;
  collateral: string;
  conditions: string;
  disbursalHours: number;
  validityDays: number;
  responseSeconds: number;
}

export interface LenderProduct {
  id: string;
  lenderId: string;
  name: string;
  type: string;
  minTicket: number; // rupees
  maxTicket: number;
  sectors: string[];
  corridors: string[];
  buyerCountries: string[];
  maxTenureDays: number;
  minStrength: number;
  requiredDocs: DocType[];
  pricingModel: string;
  collateralRules: string;
  active: boolean;
  pricing: OfferPricing;
}

export interface EligibilityDecision {
  lenderId: string;
  lenderName: string;
  productId?: string;
  eligible: boolean;
  reasons: string[];
}

export interface Offer {
  id: string;
  tradeId: string;
  lenderId: string;
  productName: string;
  advancePct: number;
  ratePct: number;
  tenureDays: number;
  fees: Fee[];
  recourse: boolean;
  recourseNote?: string;
  collateral: string;
  conditions: string;
  disbursalHours: number;
  validUntil: string;
  status: 'open' | 'accepted' | 'expired';
  scripted: boolean;
  receivedAt: string;
}

export interface OfferSchedule {
  tradeId: string;
  lenderId: string;
  dueAt: number;
  done: boolean;
}

export interface RegistryEntry {
  position: number;
  fingerprint: string;
  irnFingerprint?: string;
  lenderId: string;
  status: 'FINANCED' | 'SETTLED' | 'RELEASED';
  timestamp: string;
  refersTo?: number;
  prevHash: string;
  entryHash: string;
  signature: string;
}

export interface RegistryReceipt {
  position: number;
  fingerprint: string;
  entryHash: string;
  timestamp: string;
}

/** Private to the registry, for fuzzy matching. Never leaves the server and is not part of the chain. */
export interface RegistryMatchRow {
  position: number;
  supplierHash: string;
  buyerHash: string;
  invoiceNo: string;
  amount: number;
  date: string;
  currency: string;
  irn?: string;
}

export interface ConsentArtefact {
  id: string;
  orgId: string;
  scope: string; // "trade:<id>" or "passport"
  recipientOrgId: string;
  purpose: string;
  grantedAt: string;
  expiresAt: string;
  revokedAt?: string;
}

export interface AuditEvent {
  id: string;
  actor: string;
  action: string;
  object: string;
  timestamp: string;
  meta?: unknown;
}

export type QueueReason = 'Possible duplicate' | 'Low-confidence extraction' | 'Check 8 failed and flagged';
export type OpsDecision = 'confirm-duplicate' | 'clear' | 'ask-info';

export interface QueueCase {
  id: string;
  tradeId: string;
  reason: QueueReason;
  openedAt: string;
  reviewer: string;
  status: 'open' | 'waiting' | 'closed';
  detail?: unknown;
  decision?: { decision: OpsDecision; note: string; by: string; at: string };
}

export interface DemoNotification {
  id: number;
  audience: string; // org id, or "ops"
  kind: 'toast' | 'sms';
  tone?: 'pass' | 'fail' | 'warn' | 'info';
  message: string;
  at: string;
}

export interface WebhookEvent {
  id: string;
  type: 'trade.verified' | 'offer.received' | 'financing.disbursed' | 'shipment.updated' | 'repayment.received' | 'duplicate.flagged';
  object: string;
  at: string;
}

export interface DemoState {
  version: number;
  scenario: ScenarioId;
  speed: 0.5 | 1 | 2 | 0;
  stagedLabels: boolean;
  clockOffsetDays: number;
  resetCount: number;
  seq: number;
  orgs: Org[];
  buyers: Buyer[];
  products: LenderProduct[];
  trades: Trade[];
  docs: Doc[];
  checks: VerificationCheck[];
  runs: VerificationRun[];
  consents: ConsentArtefact[];
  offers: Offer[];
  schedules: OfferSchedule[];
  declines: Array<{ tradeId: string; lenderId: string }>;
  registry: RegistryEntry[];
  registryIndex: RegistryMatchRow[];
  lastAnchoredAt?: string;
  audit: AuditEvent[];
  queue: QueueCase[];
  notifications: DemoNotification[];
  events: WebhookEvent[];
  lastRanking: Record<string, string>;
  lastPassportHash: Record<string, string>;
}

export interface Session {
  role: Role;
  lenderId?: string;
}
