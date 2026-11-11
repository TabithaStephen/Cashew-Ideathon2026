'use client';

import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { StatusChip } from '@/components/StatusChip';
import { useToast } from '@/components/Toast';
import { api, useAction, useApi } from '@/lib/client/api';
import { formatINR } from '@/lib/format';
import { motionTokens } from '@/lib/motion';
import { formatDate } from '@/lib/ui';
import { cn } from '@/lib/utils';
import { Rows } from './parts';

const SORTS = [['cost', 'Lowest cost'], ['fastest', 'Fastest'], ['cash', 'Most cash']] as const;
const days = (h: number) => `${h} h`;
const num = (n: number, d = 2) => new Intl.NumberFormat('en-IN', { maximumFractionDigits: d, minimumFractionDigits: d }).format(n);

/** "Show the calculation": the arithmetic with this offer's actual numbers. */
export function Calculation({ offer }: { offer: any }) {
  const V = offer.invoiceValueInr;
  const lines = [
    `Invoice value   ${formatINR(V)}`,
    `Advance         ${formatINR(V)} × ${offer.advancePct}% = ${formatINR(offer.advance)}`,
    `Interest        ${formatINR(offer.advance)} × ${offer.ratePct}% × ${offer.tenureDays}/365 = ${formatINR(offer.interest)}`,
    ...offer.feeLines.flatMap((f: any) => [
      `${f.label}: ${f.kind === 'flat' ? 'flat' : `${f.value}% of ${f.kind === 'pctInvoice' ? 'invoice' : 'advance'}`} = ${formatINR(f.amount)}`,
      ...(f.hidden ? ['  Stated only in the conditions'] : []),
    ]),
    `Total fees      ${formatINR(offer.totalFees)}`,
    `Total cost      ${formatINR(offer.interest)} + ${formatINR(offer.totalFees)} = ${formatINR(offer.totalCost)}`,
    `Effective cost  (${formatINR(offer.totalCost)} ÷ ${formatINR(offer.advance)}) × 365/${offer.tenureDays} = ${num(offer.effectiveApr)}%`,
    `Net cash        ${formatINR(offer.advance)} − ${formatINR(offer.totalFees)} = ${formatINR(offer.netCash)}`,
  ];
  return (
    <>
      <pre className="overflow-x-auto bg-paper p-3 font-mono text-label">{lines.join('\n')}</pre>
      <p className="mt-1 text-[12px] leading-4 text-ink-2">Each line is rounded for display. Totals use exact values, so they can differ by ₹1 from the rounded lines.</p>
    </>
  );
}

function HiddenFee({ line }: { line: any }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="block">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-7 max-md:min-h-11" title={`Stated in the conditions, not in the headline fees. +${formatINR(line.amount)}`}>
        <StatusChip kind="warn">Hidden fee found</StatusChip>
      </button>
      {open && <span className="mt-1 block text-table text-warn">Stated in the conditions, not in the headline fees. +{formatINR(line.amount)}</span>}
    </span>
  );
}

function SignModal({ offer, open, onClose, onSigned }: { offer: any; open: boolean; onClose: () => void; onSigned: () => void }) {
  const { run, busy } = useAction();
  const [agreed, setAgreed] = useState(false);
  const [stage, setStage] = useState<'terms' | 'otp'>(offer?.status === 'accepted' ? 'otp' : 'terms');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (open) {
      setStage(offer?.status === 'accepted' ? 'otp' : 'terms');
      setOtp('');
      setAgreed(false);
    }
  }, [open, offer?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!offer) return null;
  const toOtp = async () => {
    const accepted = await run(() => api(`offers/${offer.id}/accept`, { method: 'POST' }));
    if (accepted) setStage('otp');
  };
  const sign = async () => {
    const signed = await run(() => api(`offers/${offer.id}/sign`, { body: { otp } }));
    if (signed) onSigned();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={stage === 'terms' ? `Accept ${offer.lenderName}?` : 'Sign with OTP'}
      footer={
        stage === 'terms' ? (
          <>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" disabled={!agreed} loading={busy} onClick={toOtp}>Sign with OTP</Button>
          </>
        ) : (
          <Button variant="primary" disabled={otp.length !== 6} loading={busy} onClick={sign}>Sign contract</Button>
        )
      }
    >
      {stage === 'terms' ? (
        <div className="flex flex-col gap-3">
          <dl className="grid grid-cols-[max-content_minmax(0,1fr)] gap-x-4 gap-y-1 text-table">
            <dt className="text-ink-2">Product</dt><dd>{offer.productName}</dd>
            <dt className="text-ink-2">Advance</dt><dd className="tabular">{offer.advancePct}% = {formatINR(offer.advance)}</dd>
            <dt className="text-ink-2">Effective annual cost</dt><dd className="tabular font-semibold">{num(offer.effectiveApr)}%</dd>
            <dt className="text-ink-2">Total fees</dt><dd className="tabular">{formatINR(offer.totalFees)}</dd>
            <dt className="text-ink-2">Net cash to you</dt><dd className="tabular font-semibold">{formatINR(offer.netCash)}</dd>
            <dt className="text-ink-2">Repayment</dt><dd>{offer.tenureDays} days. {offer.recourseNote ?? (offer.recourse ? 'Recourse' : 'Non-recourse')}.</dd>
            <dt className="text-ink-2">Conditions</dt><dd>{offer.conditions}</dd>
          </dl>
          <label className="flex min-h-11 items-center gap-3 font-medium">
            <input type="checkbox" className="size-5 flex-none" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
            I have read and agree
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p>Enter the 6-digit code. This signature is simulated: no contract is signed and no money moves.</p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="flex-1">
              <span className="field-label mb-1 block">One-time password</span>
              <input className="input tabular" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} />
            </label>
            <Button onClick={() => setOtp('482913')}>Autofill</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}

const COLUMN_WIDTH = 'min-w-[208px]';

export function OfferComparison({ trade, onFinanced }: { trade: any; onFinanced?: () => void }) {
  const toast = useToast();
  const [sort, setSort] = useState<'cost' | 'fastest' | 'cash'>('cost');
  const { data } = useApi<any>(`trades/${trade.id}/offers?sort=${sort}`, 1000);
  const [calc, setCalc] = useState(false);
  const [signing, setSigning] = useState<any>();

  if (!data) return <Rows count={6} />;
  const { offers, waiting, declined, badges } = data;
  const closed = trade.status !== 'OFFERS_OPEN';
  const pendingSign = trade.status === 'OFFER_ACCEPTED';

  if (offers.length === 0 && waiting.length === 0) {
    return <div className="panel px-4 py-8">No offers yet. Lenders see your trade after you share it.</div>;
  }

  const cell = (offer: any, index: number, children: React.ReactNode, className?: string) => (
    <motion.td
      key={offer.id}
      initial={{ opacity: 0, x: 32 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: motionTokens.base, ease: motionTokens.easeOut, delay: index * motionTokens.offerStagger }}
      className={cn(COLUMN_WIDTH, offer.status === 'expired' && 'text-ink-3', className)}
    >
      {children}
    </motion.td>
  );

  const row = (label: string, render: (offer: any) => React.ReactNode, className?: string) => (
    <tr>
      <th scope="row" className="min-w-40 font-medium text-ink-2">{label}</th>
      {offers.map((offer: any, i: number) => cell(offer, i, render(offer), className))}
    </tr>
  );

  return (
    <div className="flex flex-col gap-4">
      {waiting.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-3" role="status">
          {waiting.map((name: string) => (
            <div key={name} className="panel p-3">
              <p className="text-table text-ink-2">Waiting for {name}…</p>
              <span className="mt-2 block h-3 w-2/3 bg-pending-soft" />
            </div>
          ))}
        </div>
      )}
      {declined.length > 0 && <p className="text-table text-ink-2">{declined.join(', ')} declined to offer.</p>}

      {offers.length > 0 && (
        <>
          <div role="group" aria-label="Sort offers" className="flex flex-wrap items-center gap-2">
            <span className="field-label">Sort</span>
            {SORTS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={sort === key}
                onClick={() => setSort(key)}
                className={cn('h-9 rounded-control border px-3 text-table transition-colors duration-fast max-md:h-11', sort === key ? 'border-ink bg-ink text-sheet' : 'border-rule bg-sheet hover:border-ink')}
              >
                {label}
              </button>
            ))}
          </div>

          <div data-tour="offer-table" className="panel overflow-x-auto">
            <table className="ledger w-full border-collapse">
              <thead>
                <tr>
                  <td />
                  {offers.map((offer: any, i: number) =>
                    cell(offer, i, (
                      <div className="flex flex-col items-start gap-1">
                        <span className="text-h2 text-ink">{offer.lenderName}</span>
                        <span className="text-table font-normal text-ink-2">{offer.productName}</span>
                        <span className="flex flex-wrap gap-1">
                          {badges.lowestCost === offer.id && <StatusChip kind="pass">Lowest cost</StatusChip>}
                          {badges.fastest === offer.id && <StatusChip kind="info">Fastest</StatusChip>}
                          {badges.mostCash === offer.id && <StatusChip kind="info">Most cash upfront</StatusChip>}
                          {offer.status === 'accepted' && <StatusChip kind="pass">Accepted</StatusChip>}
                          {offer.status === 'expired' && <StatusChip kind="unknown">Closed</StatusChip>}
                        </span>
                      </div>
                    ), 'border-b-2 border-ink'),
                  )}
                </tr>
              </thead>
              <tbody>
                {row('Advance %', (o) => <span className="tabular">{o.advancePct}%</span>)}
                {row('Advance amount', (o) => <span className="tabular">{formatINR(o.advance)}</span>)}
                {row('Headline rate', (o) => <span className="tabular">{o.ratePct}% p.a.</span>)}
                {row('Effective annualised cost', (o) => <span className="tabular text-money">{num(o.effectiveApr)}%</span>)}
                {row('Total fees', (o) => (
                  <div className="flex flex-col gap-1">
                    <span className="tabular font-semibold">{formatINR(o.totalFees)}</span>
                    <ul className="text-[13px] leading-[18px] text-ink-2">
                      {o.feeLines.map((f: any) => <li key={f.label} className="tabular">{f.label}: {formatINR(f.amount)}</li>)}
                    </ul>
                    {o.feeLines.filter((f: any) => f.hidden).map((f: any) => <HiddenFee key={f.label} line={f} />)}
                  </div>
                ))}
                {row('Net cash to you', (o) => <span className="tabular font-semibold">{formatINR(o.netCash)}</span>)}
                {row('Disbursal time', (o) => <span className="tabular">{days(o.disbursalHours)}</span>)}
                {row('Recourse', (o) => o.recourseNote ?? (o.recourse ? 'Recourse' : 'Non-recourse'))}
                {row('Collateral', (o) => o.collateral)}
                {row('Conditions', (o) => o.conditions)}
                {row('Valid until', (o) => <span className="tabular">{formatDate(o.validUntil)}</span>)}
                {!closed || pendingSign ? (
                  <tr>
                    <td />
                    {offers.map((offer: any, i: number) =>
                      cell(offer, i, (pendingSign && offer.status !== 'accepted') ? null : (
                        <Button variant="primary" onClick={() => setSigning(offer)}>{pendingSign ? 'Continue to e-sign' : 'Accept this offer'}</Button>
                      )),
                    )}
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <p className="font-medium">Offers are ranked by what they cost you, never by what lenders pay Cashew.</p>

          <div>
            <Button aria-expanded={calc} onClick={() => setCalc(!calc)}>{calc ? 'Hide the calculation' : 'Show the calculation'}</Button>
            {calc && (
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {offers.map((offer: any) => (
                  <div key={offer.id} className="panel min-w-0 p-3">
                    <p className="mb-2 font-semibold">{offer.lenderName}</p>
                    <Calculation offer={offer} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <SignModal
        offer={signing}
        open={Boolean(signing)}
        onClose={() => setSigning(undefined)}
        onSigned={() => {
          setSigning(undefined);
          toast('Contract signed.', { tone: 'pass' });
          onFinanced?.();
        }}
      />
    </div>
  );
}
