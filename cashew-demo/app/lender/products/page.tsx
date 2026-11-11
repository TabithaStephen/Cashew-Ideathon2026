'use client';

import { useState } from 'react';
import { Button } from '@/components/Button';
import { Drawer } from '@/components/Drawer';
import { StatusChip } from '@/components/StatusChip';
import { KeyValues, PageHead, Rows } from '@/components/app/parts';
import { api, useAction, useApi } from '@/lib/client/api';
import { formatINR } from '@/lib/format';
import { useToast } from '@/components/Toast';

const list = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const TYPES = ['Invoice discounting', 'PO finance', 'Pre-shipment credit', 'Post-shipment credit', 'Export factoring'];

function EditDrawer({ product, onClose }: { product?: any; onClose: () => void }) {
  const toast = useToast();
  const { run, busy } = useAction();
  const [draft, setDraft] = useState<any>();
  const form = draft?.id === product?.id ? draft : product && { ...product, sectors: product.sectors.join(', '), corridors: product.corridors.join(', '), buyerCountries: product.buyerCountries.join(', '), requiredDocs: product.requiredDocs.join(', ') };
  const set = (key: string, value: unknown) => setDraft({ ...form, [key]: value });
  const save = async () => {
    const saved = await run(() => api(`lender/products/${product.id}`, { method: 'PATCH', body: { type: form.type, minTicket: Number(form.minTicket), maxTicket: Number(form.maxTicket), sectors: list(form.sectors), corridors: list(form.corridors), buyerCountries: list(form.buyerCountries), maxTenureDays: Number(form.maxTenureDays), minStrength: Number(form.minStrength), requiredDocs: list(form.requiredDocs), pricingModel: form.pricingModel, collateralRules: form.collateralRules, active: form.active } }));
    if (saved) {
      toast('Product saved. This applies to the next offer request.', { tone: 'pass' });
      setDraft(undefined);
      onClose();
    }
  };
  const text = (label: string, key: string, numeric = false) => (
    <label className="block">
      <span className="field-label mb-1 block">{label}</span>
      <input className={numeric ? 'input tabular' : 'input'} inputMode={numeric ? 'numeric' : undefined} value={form[key]} onChange={(e) => set(key, e.target.value)} />
    </label>
  );
  return (
    <Drawer open={Boolean(product)} onClose={onClose} title={product ? `Edit ${product.name}` : ''} footer={<Button variant="primary" loading={busy} onClick={save}>Save product</Button>}>
      {form && (
        <div className="flex flex-col gap-3">
          <label className="block"><span className="field-label mb-1 block">Type</span>
            <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>{TYPES.map((t) => <option key={t}>{t}</option>)}</select>
          </label>
          <div className="grid grid-cols-2 gap-3">{text('Minimum ticket (₹)', 'minTicket', true)}{text('Maximum ticket (₹)', 'maxTicket', true)}</div>
          {text('Sectors, separated by commas', 'sectors')}
          {text('Corridors', 'corridors')}
          {text('Buyer countries', 'buyerCountries')}
          <div className="grid grid-cols-2 gap-3">{text('Maximum tenure (days)', 'maxTenureDays', true)}{text('Minimum evidence strength', 'minStrength', true)}</div>
          {text('Pricing model', 'pricingModel')}
          {text('Required documents', 'requiredDocs')}
          {text('Collateral rules', 'collateralRules')}
          <label className="flex min-h-11 items-center gap-3"><input type="checkbox" className="size-5" checked={form.active} onChange={(e) => set('active', e.target.checked)} /> Product is active</label>
        </div>
      )}
    </Drawer>
  );
}

export default function Products() {
  const { data } = useApi<any>('lender/products');
  const [editing, setEditing] = useState<any>();
  return (
    <>
      <PageHead title="Products" intro="Eligibility follows these settings. Narrow a ticket range and you drop out of the next offer request for trades outside it." />
      {!data ? <Rows /> : (
        <div className="grid items-start gap-4 lg:grid-cols-2">
          {data.products.map((p: any) => (
            <section key={p.id} className="panel flex flex-col gap-3 p-4">
              <div className="flex items-start justify-between gap-2">
                <h2>{p.name}</h2>
                <StatusChip kind={p.active ? 'pass' : 'unknown'}>{p.active ? 'Active' : 'Inactive'}</StatusChip>
              </div>
              <KeyValues rows={[['Type', p.type], ['Ticket range', <span key="t" className="tabular">{formatINR(p.minTicket)} to {formatINR(p.maxTicket)}</span>], ['Sectors', p.sectors.join(', ')], ['Corridors', p.corridors.join(', ')], ['Max tenure', `${p.maxTenureDays} days`], ['Min evidence', p.minStrength], ['Pricing', p.pricingModel], ['Required docs', p.requiredDocs.join(', ')]]} />
              <div><Button onClick={() => setEditing(p)}>Edit</Button></div>
            </section>
          ))}
        </div>
      )}
      <EditDrawer product={editing} onClose={() => setEditing(undefined)} />
    </>
  );
}
