// Verification runner definitions (Blueprint Section 11.1). Staged checks read a seeded source table
// through one adapter; check 8 and check 12 are computed for real.
import { compareDocuments, type DocFields } from '@/lib/engines/crossdoc';
import type { CheckResult, Trade } from '@/lib/types';
import type { RegistryCheck } from '@/lib/engines/registry';

export interface CheckOutcome {
  result: CheckResult;
  line: string;
  evidence: unknown;
  flag?: 'possible-duplicate';
}

export type ExternalSources = Record<number, CheckOutcome>;

export interface TradeContext {
  trade: Pick<Trade, 'shipmentStage' | 'buyerConfirmed'>;
  docs: DocFields;
  sources: ExternalSources;
  registry: () => RegistryCheck;
}

export interface CheckDef {
  id: number;
  title: string;
  source: string;
  mode: 'staged' | 'real';
  manualFallback: boolean;
  durationMs: number;
  run(ctx: TradeContext): CheckOutcome;
}

// Every staged source goes through this adapter, and each has a manual fallback.
const staged = (id: number, title: string, source: string, durationMs: number): CheckDef => ({
  id, title, source, durationMs, mode: 'staged', manualFallback: true,
  run: (ctx) => ctx.sources[id],
});

export const CHECKS: CheckDef[] = [
  staged(1, 'Business is active', 'MCA', 900),
  staged(2, 'IEC is valid', 'DGFT', 600),
  staged(3, 'Promoter identity', 'KYC', 700),
  staged(4, 'GST filing record', 'GST', 1200),
  staged(5, 'Invoice is authentic', 'e-Invoice', 800),
  staged(6, 'Goods movement documents', 'Customs', 500),
  {
    ...staged(7, 'Shipment status', 'Carrier', 1800),
    run: (ctx) =>
      ctx.trade.shipmentStage >= 2
        ? { result: 'pass', line: 'Carrier confirms the vessel has sailed.', evidence: { carrier: 'simulated', stage: ctx.trade.shipmentStage } }
        : ctx.sources[7],
  },
  {
    id: 8, title: 'Documents agree with each other', source: 'Computed', mode: 'real', manualFallback: false, durationMs: 400,
    run: (ctx) => {
      const compared = compareDocuments(ctx.docs);
      return { result: compared.passed ? 'pass' : 'fail', line: compared.headline, evidence: compared };
    },
  },
  staged(9, 'Buyer standing', 'Buyer registry', 1000),
  staged(10, 'Sanctions screening', 'Sanctions', 900),
  staged(11, 'Related-party check', 'MCA', 700),
  {
    id: 12, title: 'Not financed elsewhere', source: 'Cashew registry', mode: 'real', manualFallback: false, durationMs: 1000,
    run: (ctx) => {
      const check = ctx.registry();
      if (check.code === 'FINANCED_BY_OTHER') {
        return { result: 'fail', line: 'This invoice has already been financed through Cashew. Details are not shared.', evidence: check };
      }
      if (check.code === 'POSSIBLE_DUPLICATE') {
        return { result: 'unknown', flag: 'possible-duplicate', line: `Possible duplicate. Similarity ${check.similarity?.overall.toFixed(2)} to an invoice already financed.`, evidence: check };
      }
      if (check.code === 'RELEASED') {
        return { result: 'pass', line: 'Matched an invoice that has since been settled, so it is free to finance.', evidence: check };
      }
      return { result: 'pass', line: 'No match in the duplicate-financing registry.', evidence: check };
    },
  },
  staged(13, 'Bank account ownership', 'Penny drop', 600),
  {
    ...staged(14, 'Buyer acknowledgement', 'Buyer link', 500),
    run: (ctx) =>
      ctx.trade.buyerConfirmed
        ? { result: 'pass', line: 'Buyer confirmed the trade through the link.', evidence: { buyerLink: 'confirmed' } }
        : ctx.sources[14],
  },
];

export const checkDef = (id: number) => CHECKS.find((c) => c.id === id)!;
