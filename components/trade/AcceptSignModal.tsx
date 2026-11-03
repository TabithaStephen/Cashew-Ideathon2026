'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/Button';
import { Checkbox, Input } from '@/components/Field';
import { Modal } from '@/components/Overlay';
import { CheckIcon } from '@/components/CheckIcon';
import { api, useApi } from '@/lib/client';
import type { OfferItem } from '@/lib/client-types';
import { inr } from '@/lib/format';
import { useUI } from '@/lib/ui-store';

/** Accept + OTP e-sign (STAGED). Any 6 digits; Autofill for the demo. */
export function AcceptSignModal({ item, tradeId, status, onClose, valueInr }: { item: OfferItem | null; tradeId: string; status: string; onClose: () => void; valueInr: number }) {
  const [agree, setAgree] = useState(false);
  const [otp, setOtp] = useState('');
  const [busy, setBusy] = useState(false);
  const [signed, setSigned] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const router = useRouter();
  const ws = useApi<{ trade: { status: string } }>(signed ? `/api/trades/${tradeId}` : null, 500);
  const step = status === 'OFFERS_OPEN' ? 'accept' : status === 'OFFER_ACCEPTED' ? 'sign' : 'done';
  useEffect(() => { if (!item) { setAgree(false); setOtp(''); setSigned(false); setBlocked(false); } }, [item]);
  const financed = ws.data?.trade.status === 'FINANCED' || (signed && !['CONTRACT_SIGNED', 'OFFER_ACCEPTED'].includes(ws.data?.trade.status ?? 'CONTRACT_SIGNED'));
  useEffect(() => {
    if (financed) { const t = setTimeout(() => { onClose(); router.push(`/app/trades/${tradeId}?tab=financing`); }, 1200); return () => clearTimeout(t); }
  }, [financed]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!item) return <Modal open={false} onClose={onClose} title="">{null}</Modal>;
  const m = item.maths;
  const accept = async () => { setBusy(true); try { await api(`/api/offers/${item.offer.id}/accept`, { json: {} }); } finally { setBusy(false); } };
  const sign = async () => {
    setBusy(true);
    try {
      const r = await api<{ committed: boolean }>(`/api/offers/${item.offer.id}/sign`, { json: { otp } });
      setSigned(true);
      if (!r.committed) setBlocked(true);
      useUI.getState().toast({ tone: 'success', text: r.committed ? 'Contract signed. Recorded in the duplicate-financing registry.' : 'Contract signed, but the registry blocked financing.' });
    } finally { setBusy(false); }
  };
  return (
    <Modal open={!!item} onClose={onClose} dismissable={!busy} title={signed ? (financed ? 'Funded' : 'Disbursing…') : step === 'accept' ? `Accept ${item.lender}'s offer` : 'Sign with OTP'}>
      {!signed && (
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm bg-canvas rounded-btn p-4 mb-4">
          <span className="text-ink-2">Invoice value</span><span className="tabular text-right">{inr(valueInr)}</span>
          <span className="text-ink-2">Advance ({(item.offer.advancePct * 100).toFixed(0)}%)</span><span className="tabular text-right">{inr(m.advance)}</span>
          <span className="text-ink-2">Total cost over {item.offer.tenureDays} days</span><span className="tabular text-right">{inr(m.totalCost)}</span>
          <span className="text-ink-2 font-semibold">Effective annualised cost</span><span className="tabular text-right font-semibold">{(m.effectiveAPR * 100).toFixed(2)}%</span>
          <span className="text-ink-2 font-semibold">Net cash to you</span><span className="tabular text-right font-semibold">{inr(m.netCash)}</span>
          <span className="text-ink-2">Recourse</span><span className="text-right">{item.offer.recourseLabel}</span>
          <span className="text-ink-2">Disbursal</span><span className="text-right">within {item.offer.disbursalHours} h</span>
        </div>
      )}
      {!signed && <p className="text-caption text-ink-2 mb-4">Conditions: {item.offer.conditions}</p>}
      {!signed && step === 'accept' && (
        <div className="space-y-4">
          <Checkbox id="agree" checked={agree} onChange={setAgree}>I have read and agree to the key terms above.</Checkbox>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!agree} loading={busy} onClick={accept}>Accept this offer</Button></div>
        </div>
      )}
      {!signed && step === 'sign' && (
        <div className="space-y-3">
          <p className="text-sm text-ink-2">We sent a 6-digit code to your registered mobile (simulated).</p>
          <div className="flex gap-2">
            <Input data-autofocus inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="••••••" className="font-mono tracking-[0.4em] text-lg w-44" aria-label="One-time code" />
            <Button variant="secondary" onClick={() => setOtp(String(Math.floor(100000 + Math.random() * 900000)))}>Autofill (demo)</Button>
          </div>
          <div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Later</Button><Button disabled={otp.length !== 6} loading={busy} onClick={sign}>Sign with OTP</Button></div>
        </div>
      )}
      {signed && blocked && (
        <div className="flex flex-col items-center text-center py-6">
          <CheckIcon state="fail" size={56} />
          <p className="text-sm font-semibold mt-4 text-danger">Financing blocked by the duplicate-financing registry.</p>
          <p className="text-caption text-ink-3 mt-1">This invoice is already financed through Cashew. The other lender is not revealed.</p>
          <Button className="mt-4" variant="secondary" onClick={onClose}>Close</Button>
        </div>
      )}
      {signed && !blocked && (
        <div className="flex flex-col items-center text-center py-6">
          <CheckIcon state={financed ? 'pass' : 'running'} size={56} />
          <p className="text-sm font-semibold mt-4">{financed ? `${inr(m.netCash)} disbursed by ${item.lender}` : 'Contract signed. Disbursing funds…'}</p>
          <p className="text-caption text-ink-3 mt-1">Simulated disbursal. No real money moves in the demo.</p>
        </div>
      )}
      {step === 'done' && !signed && <p className="text-sm text-ink-2">This offer was accepted and signed.</p>}
    </Modal>
  );
}
