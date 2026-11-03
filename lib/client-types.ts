// Response shapes of the API, for client components (type-only imports of server modules are erased).
import type { CheckView } from './service';
import type { workspace, tradeRow } from './views';
import type { OfferMaths } from './engines/matching';
import type { Doc, DocType, Offer, RiskProfile } from './types';

export type Workspace = ReturnType<typeof workspace>;
export type TradeRowT = ReturnType<typeof tradeRow>;
export interface EvidenceRes {
  tradeId: string; status: string; flagged: number[]; running: boolean; runCheckIds: number[]; checks: CheckView[];
  counts: { pass: number; fail: number; unknown: number; pending: number; warn: number }; bundleHash: string;
  documents: Partial<Record<DocType, Doc>>;
}
export interface OfferItem { offer: Offer; maths: OfferMaths; lender: string; badges: string[] }
export interface OffersRes {
  tradeId: string; status: string; valueInr: number; sealed: boolean; acceptedOfferId: string | null; offers: OfferItem[];
  requests: { id: string; lenderId: string; lender: string; status: string; eligible: boolean; reasons: string[]; dueAt: number | null }[];
  serverNow: number;
}
export type Risk = RiskProfile;
