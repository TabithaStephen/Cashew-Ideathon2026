// Core types (Blueprint Section 13.1). There is intentionally NO commission field anywhere.

export type Role = 'exporter' | 'lender' | 'ops';
export type ScenarioId = 'A' | 'B' | 'C';

/** 'warn' is used only for the registry's POSSIBLE_DUPLICATE outcome on check 12. */
export type CheckResult = 'pass' | 'fail' | 'unknown' | 'pending' | 'warn';

export type TradeStatus =
  | 'DRAFT' | 'SUBMITTED' | 'VERIFYING' | 'NEEDS_INFO' | 'VERIFIED' | 'OFFERS_OPEN'
  | 'OFFER_ACCEPTED' | 'CONTRACT_SIGNED' | 'FINANCED' | 'SHIPMENT_IN_TRANSIT' | 'DELIVERED'
  | 'BUYER_ACCEPTED' | 'REPAID' | 'CLOSED'
  | 'REJECTED_VERIFICATION' | 'WITHDRAWN' | 'DISPUTED' | 'DEFAULTED';

export interface Org {
  id: string; type: 'sme' | 'lender' | 'platform'; legalName: string; shortName: string;
  gstin?: string; iec?: string; udyam?: string; tier?: 0 | 1 | 2 | 3; city?: string;
  incorporated?: number; kind?: string;
}

export interface Buyer { id: string; name: string; country: string; registrationId: string; city: string; rating?: string; yearsOfFilings?: number; }

export type DocType = 'po' | 'invoice' | 'packing' | 'shippingBill' | 'bl';
export const DOC_TYPES: DocType[] = ['po', 'invoice', 'packing', 'shippingBill', 'bl'];
export const DOC_LABELS: Record<DocType, string> = {
  po: 'Purchase Order', invoice: 'Commercial Invoice', packing: 'Packing List',
  shippingBill: 'Shipping Bill', bl: 'Bill of Lading',
};

export interface ExtractedField { value: string | number | boolean; confidence: number; unit?: string; currency?: string; reviewed?: boolean; }
export interface ExtractedFields { docType: DocType; fields: Record<string, ExtractedField>; }

export interface Doc {
  id: string; tradeId: string; type: DocType; fileName: string; sizeBytes: number;
  sha256: string; extracted: ExtractedFields; verifiedStatus: CheckResult; version: number;
  uploadedAt: string; amended?: boolean;
}

export interface Trade {
  id: string; smeId: string; buyerId: string; corridor: string; hsCode: string;
  goods: string; invoiceNo: string;
  value: number; currency: string; fx: number; incoterm: string;
  paymentTermsDays: number; status: TradeStatus; scenario: ScenarioId;
  flaggedUnknownOrFailed: number[]; createdAt: string; updatedAt: string;
  // demo / lifecycle extras
  buyerConfirmed?: boolean;
  shipmentStage?: number;           // index into SHIPMENT_STAGES
  acceptedOfferId?: string;
  offersRequestedAt?: string;
  offerWindowClosed?: boolean;
  signedAt?: string;
  disbursalDueAt?: number;          // epoch ms (staged 2 s disbursal)
  disbursedAt?: string;
  registryReceipt?: { fingerprint: string; position: number; entryHash: string; timestamp: string } | null;
  registryBlock?: { result: RegistryCheckCode; at: string } | null;
  repaidAt?: string;
  attempt?: 1 | 2;                  // Scenario C duplicate attempt marker
  historical?: boolean;             // seeded prior trade (Passport history)
  advanceInr?: number;
}

export const SHIPMENT_STAGES = ['Booked', 'Loaded', 'Sailed', 'Arrived', 'Delivered'] as const;

export interface VerificationCheck {
  id: string; tradeId: string; checkId: number; result: CheckResult; line: string;
  source: string; mode: 'staged' | 'real'; evidence: unknown; evidenceHash: string;
  runAt: string; durationMs: number; runId: string;
}

export interface VerificationRun {
  id: string; tradeId: string; startedAt: number; checkIds: number[];
  schedule: { checkId: number; startMs: number; durationMs: number }[];
  done: number[]; finished: boolean;
}

export type Band = 'Strong' | 'Moderate' | 'Limited';
export interface RiskProfile {
  tradeId: string; strength: number; band: Band; riskBand: 'Low' | 'Medium' | 'High';
  components: Record<ComponentKey, number>; componentMax: Record<ComponentKey, number>;
  blocking: number[]; weights: number[]; ruleVersion: string; computedAt: string;
  inputs: Record<number, CheckResult>;
}
export type ComponentKey = 'entity' | 'txn' | 'buyer' | 'struct';

export interface FeeTemplate { label: string; kind: Fee['kind']; value: number; statedIn: Fee['statedIn']; }
export interface LenderProduct {
  id: string; lenderId: string; name: string; type: string; minTicket: number; maxTicket: number;
  sectors: string[]; corridors: string[]; buyerCountries: string[]; maxTenureDays: number;
  minStrength: number; requiredDocs: DocType[]; active: boolean;
  pricing: {
    advancePct: number; ratePct: number; processingPct: number; extraFees: FeeTemplate[];
    disbursalHours: number; recourse: boolean; recourseLabel: string; collateral: string;
    conditions: string; validDays: number; responseSeconds: number;
  };
}

export interface Fee { label: string; kind: 'pctAdvance' | 'flat' | 'pctInvoice'; value: number; statedIn: 'headline' | 'conditions'; }

export interface Offer {
  id: string; tradeId: string; lenderId: string; productId?: string; advancePct: number; ratePct: number;
  tenureDays: number; fees: Fee[]; recourse: boolean; recourseLabel?: string; collateral: string;
  conditions: string; validUntil: string; status: 'open' | 'accepted' | 'expired' | 'declined';
  disbursalHours: number; submittedAt: string; scripted: boolean;
}

export interface OfferRequest {
  id: string; tradeId: string; lenderId: string; eligible: boolean; reasons: string[];
  dueAt: number | null; status: 'requested' | 'responded' | 'not-sent' | 'declined';
  createdAt: string;
}

export type RegistryStatus = 'FINANCED' | 'SETTLED' | 'RELEASED';
export interface RegistryEntry {
  position: number; fingerprint: string; irnFingerprint?: string; lenderId: string;
  status: RegistryStatus; timestamp: string; refPosition?: number;
  prevHash: string; entryHash: string; signature: string;
}
/** Server-side matching index for fuzzy duplicate detection. Never returned by any API. */
export interface RegistryIndexRow {
  position: number; supplierHash: string; buyerHash: string; invoiceNo: string;
  amount: number; invoiceDate: string; currency: string; irnFingerprint?: string; fingerprint: string;
}
export type RegistryCheckCode = 'NONE' | 'FINANCED_BY_OTHER' | 'POSSIBLE_DUPLICATE' | 'RELEASED';

export interface ConsentArtefact {
  id: string; orgId: string; scope: string; recipientOrgId: string; recipientLabel?: string;
  purpose: string; createdAt: string; expiresAt: string; revokedAt?: string;
}

export interface AuditEvent { id: string; actor: string; action: string; object: string; timestamp: string; meta?: unknown; }

export interface OpsCase {
  id: string; tradeId: string; reason: 'Possible duplicate' | 'Low-confidence extraction' | 'Check 8 failed and flagged';
  createdAt: string; reviewer?: string; status: 'open' | 'decided';
  decision?: { outcome: 'Confirm duplicate' | 'Clear, not a duplicate' | 'Ask exporter for more info'; note: string; by: string; at: string };
  detail?: unknown;
}

export interface Notification {
  id: number; kind: 'toast' | 'sms'; tone: 'info' | 'success' | 'warn' | 'danger';
  audience: { role?: Role; orgId?: string }; text: string; createdAt: string; tradeId?: string;
}

export interface WebhookEvent { id: string; type: string; tradeId?: string; at: string; payload?: unknown; }

export interface Session { role: Role; orgId: string; }

export interface DemoState {
  version: number;
  scenario: ScenarioId;
  speed: number;                    // 0.5, 1, 2 (playback speed; durations are divided by it) or 0 = Instant
  clockOffsetMs: number;            // "Advance 30 days"
  lastAnchoredAt?: string;
  orgs: Org[]; buyers: Buyer[]; products: LenderProduct[];
  trades: Trade[]; docs: Doc[]; checks: VerificationCheck[]; runs: VerificationRun[];
  riskProfiles: RiskProfile[];
  offerRequests: OfferRequest[]; offers: Offer[];
  registry: RegistryEntry[]; registryIndex: RegistryIndexRow[];
  consents: ConsentArtefact[]; audit: AuditEvent[]; opsQueue: OpsCase[];
  notifications: Notification[]; webhooks: WebhookEvent[];
  seq: number;
  epoch: number;                    // changes on every reset (clients drop stale toasts)
}
