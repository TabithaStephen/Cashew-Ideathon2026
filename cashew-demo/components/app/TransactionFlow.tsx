'use client';

import { Timeline, type MilestoneState } from '@/components/Timeline';
import { settlement } from '@/lib/engines/matching';
import { formatINR } from '@/lib/format';

// How the transaction works, with this trade's real numbers. Nothing here moves real money.
export function TransactionFlow({ trade, narrow = false }: { trade: any; narrow?: boolean }) {
  const offer = trade.acceptedOffer;
  if (!offer) return null;
  const money = settlement({ invoiceValue: offer.invoiceValueInr, advance: offer.advance, interest: offer.interest, totalFees: offer.totalFees });
  const lender = offer.lenderName;
  const exporter = trade.smeName;

  const reached = [
    { title: 'Offer accepted', done: true, detail: `${exporter} chose ${lender}: ${offer.advancePct}% advance at an effective ${offer.effectiveApr.toFixed(2)}% a year.` },
    { title: 'Contract signed', done: Boolean(trade.signedAt), detail: 'Signed with an OTP (simulated).' },
    { title: 'Registry checked, then written', done: Boolean(trade.commit), detail: trade.commitBlocked ? 'Blocked: this invoice has already been financed through Cashew.' : 'The invoice fingerprint goes on the shared registry before any money moves, so it can’t be financed twice.' },
    { title: `${lender} pays ${exporter}`, done: Boolean(trade.commit), detail: `${formatINR(money.netToExporter)}: the ${formatINR(offer.advance)} advance minus ${formatINR(offer.totalFees)} in fees.` },
    { title: 'Goods delivered', done: trade.shipmentStage >= 4, detail: `${trade.buyerName} receives the goods. Shipment tracking is simulated.` },
    { title: `${trade.buyerName} pays the invoice`, done: Boolean(trade.repaidAt), detail: `${formatINR(money.buyerPays)}, at the end of the ${offer.tenureDays}-day payment terms.` },
    { title: 'Settled', done: Boolean(trade.repaidAt), detail: `${lender} keeps ${formatINR(money.lenderRecovers)} (advance plus ${formatINR(offer.interest)} interest). The remaining ${formatINR(money.balanceToExporter)} goes to ${exporter}. The registry marks the invoice settled.` },
  ];
  const firstOpen = reached.findIndex((step) => !step.done);
  const items = reached.map((step, i) => ({
    title: step.title,
    detail: step.detail,
    state: (step.done ? 'done' : i === firstOpen ? 'current' : 'upcoming') as MilestoneState,
  }));

  return (
    <section data-tour="flow" className="panel p-4">
      <h2>How this transaction works</h2>
      <p className="mb-3 text-table text-ink-2">Simulated: no contract is signed and no money moves. The settlement split shows how invoice discounting usually works.</p>
      <div className={narrow ? 'flex flex-col gap-4' : 'grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]'}>
        <Timeline items={items} label="Transaction steps" />
        <div className="border border-rule bg-paper p-3">
          <p className="field-label mb-2">What {exporter} ends up with</p>
          <dl className="tabular grid grid-cols-[minmax(0,1fr)_max-content] gap-x-3 gap-y-1 text-table">
            <dt>Paid up front</dt><dd className="text-right">{formatINR(money.netToExporter)}</dd>
            <dt>Balance after the buyer pays</dt><dd className="text-right">{formatINR(money.balanceToExporter)}</dd>
            <dt className="border-t border-ink pt-1 font-semibold">Total received</dt><dd className="border-t border-ink pt-1 text-right font-semibold">{formatINR(money.exporterTotal)}</dd>
            <dt>Invoice value</dt><dd className="text-right">{formatINR(money.buyerPays)}</dd>
            <dt>Total cost of finance</dt><dd className="text-right">{formatINR(money.totalCost)}</dd>
          </dl>
        </div>
      </div>
    </section>
  );
}
