'use client';
import { Pencil } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { Checkbox, Input, Label } from '@/components/Field';
import { Drawer } from '@/components/Overlay';
import { StatusChip } from '@/components/StatusChip';
import { api, useApi } from '@/lib/client';
import { inr } from '@/lib/format';
import { DOC_LABELS, DOC_TYPES, type DocType, type LenderProduct } from '@/lib/types';

const lakh = (n: number) => `₹${(n / 1e5).toLocaleString('en-IN', { maximumFractionDigits: 2 })} lakh`;

export default function Products() {
  const { data } = useApi<LenderProduct[]>('/api/lender/products', 3000);
  const [edit, setEdit] = useState<LenderProduct | null>(null);
  return (
    <div className="space-y-6">
      <div><h1>Products</h1><p className="text-ink-2">Eligibility rules decide which trades you are asked to price. Changes apply to the next offer request.</p></div>
      <div className="grid md:grid-cols-2 gap-4">
        {data?.map((p) => (
          <Card key={p.id}>
            <CardHeader title={p.name} subtitle={p.type} right={<div className="flex items-center gap-2">{p.active ? <StatusChip variant="pass" label="Active" /> : <StatusChip variant="neutral" label="Paused" />}<Button compact variant="secondary" icon={<Pencil size={14} />} onClick={() => setEdit(p)}>Edit</Button></div>} />
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-table">
              {[['Ticket range', `${lakh(p.minTicket)} to ${lakh(p.maxTicket)}`], ['Max tenure', `${p.maxTenureDays} days`], ['Sectors', p.sectors.join(', ')], ['Corridors', p.corridors.join(', ')],
                ['Minimum evidence strength', String(p.minStrength)], ['Pricing model', `${(p.pricing.advancePct * 100).toFixed(0)}% advance at ${(p.pricing.ratePct * 100).toFixed(1)}% p.a.`],
                ['Processing fee', `${(p.pricing.processingPct * 100).toFixed(2)}% of advance`], ['Required documents', p.requiredDocs.map((d) => DOC_LABELS[d]).join(', ')]].map(([k, v]) => (
                <div key={k}><dt className="text-caption text-ink-3">{k}</dt><dd className="font-medium">{v}</dd></div>
              ))}
            </dl>
          </Card>
        ))}
      </div>
      <EditDrawer product={edit} onClose={() => setEdit(null)} />
    </div>
  );
}

function EditDrawer({ product, onClose }: { product: LenderProduct | null; onClose: () => void }) {
  const [f, setF] = useState<{ minTicket: string; maxTicket: string; maxTenureDays: string; minStrength: string; active: boolean; requiredDocs: DocType[] } | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (product) setF({ minTicket: String(product.minTicket), maxTicket: String(product.maxTicket), maxTenureDays: String(product.maxTenureDays), minStrength: String(product.minStrength), active: product.active, requiredDocs: product.requiredDocs });
  }, [product?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async () => {
    if (!product || !f) return;
    setBusy(true);
    try {
      await api(`/api/lender/products/${product.id}`, { method: 'PATCH', json: { minTicket: Number(f.minTicket), maxTicket: Number(f.maxTicket), maxTenureDays: Number(f.maxTenureDays), minStrength: Number(f.minStrength), active: f.active, requiredDocs: f.requiredDocs } });
      onClose(); setF(null);
    } finally { setBusy(false); }
  };
  return (
    <Drawer open={!!product} onClose={() => { onClose(); setF(null); }} title={product ? `Edit ${product.name}` : ''} subtitle="Eligibility (Technical Master G1)"
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={() => { onClose(); setF(null); }}>Cancel</Button><Button loading={busy} onClick={save}>Save changes</Button></div>}>
      {f && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label htmlFor="min" hint={inr(Number(f.minTicket) || 0)}>Min ticket (₹)</Label><Input id="min" value={f.minTicket} onChange={(e) => setF({ ...f, minTicket: e.target.value.replace(/\D/g, '') })} /></div>
            <div><Label htmlFor="max" hint={inr(Number(f.maxTicket) || 0)}>Max ticket (₹)</Label><Input id="max" value={f.maxTicket} onChange={(e) => setF({ ...f, maxTicket: e.target.value.replace(/\D/g, '') })} /></div>
            <div><Label htmlFor="ten">Max tenure (days)</Label><Input id="ten" value={f.maxTenureDays} onChange={(e) => setF({ ...f, maxTenureDays: e.target.value.replace(/\D/g, '') })} /></div>
            <div><Label htmlFor="str">Min evidence strength</Label><Input id="str" value={f.minStrength} onChange={(e) => setF({ ...f, minStrength: e.target.value.replace(/[^\d.]/g, '') })} /></div>
          </div>
          <div><p className="text-[13px] font-medium text-ink-2 mb-2">Required documents</p>
            <div className="space-y-2">{DOC_TYPES.map((d) => <Checkbox key={d} id={`rd-${d}`} checked={f.requiredDocs.includes(d)} onChange={(v) => setF({ ...f, requiredDocs: v ? [...f.requiredDocs, d] : f.requiredDocs.filter((x) => x !== d) })}>{DOC_LABELS[d]}</Checkbox>)}</div></div>
          <Checkbox id="act" checked={f.active} onChange={(v) => setF({ ...f, active: v })}>Product active</Checkbox>
          <p className="text-caption text-ink-3">Try it: set the max ticket below ₹22,31,250 and this lender drops out of the next Scenario B offer request. Ops can see why.</p>
        </div>
      )}
    </Drawer>
  );
}
