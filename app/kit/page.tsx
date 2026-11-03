'use client';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/Button';
import { Card, CardHeader } from '@/components/Card';
import { CheckRow } from '@/components/CheckRow';
import { DocSlot } from '@/components/DocSlot';
import { EmptyState } from '@/components/EmptyState';
import { HashPill } from '@/components/HashPill';
import { Drawer, Modal } from '@/components/Overlay';
import { StatCard } from '@/components/StatCard';
import { StatusChip } from '@/components/StatusChip';
import { Stepper } from '@/components/Stepper';
import { Timeline } from '@/components/Timeline';
import { Input, Label, Select } from '@/components/Field';
import { useUI } from '@/lib/ui-store';

export default function Kit() {
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(false);
  const { toast, setDemoPanel } = useUI();
  const H = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';
  return (
    <main className="max-w-content mx-auto p-8 space-y-6">
      <div><h1>Component kit</h1><p className="text-ink-2">Every component in Section 5.4, in all its states.</p></div>

      <Card><CardHeader title="1. Button" subtitle="primary, secondary, ghost, danger · 40px and 36px compact · loading" />
        <div className="flex flex-wrap gap-3 items-center">
          <Button>Primary</Button><Button variant="secondary">Secondary</Button><Button variant="ghost">Ghost</Button><Button variant="danger">Danger</Button>
          <Button loading>Loading</Button><Button compact icon={<Plus size={16} />}>Compact</Button><Button disabled>Disabled</Button>
        </div>
      </Card>

      <Card><CardHeader title="2. StatusChip" />
        <div className="flex flex-wrap gap-2">{(['pass', 'fail', 'unknown', 'pending', 'running', 'warn', 'info'] as const).map((v) => <StatusChip key={v} variant={v} />)}</div>
      </Card>

      <div className="grid md:grid-cols-3 gap-4">
        <StatCard label="3. StatCard (count-up)" numeric={2551250} format={(n) => `₹${Math.round(n).toLocaleString('en-IN')}`} delta="+₹22,31,250 this month" tone="success" />
        <StatCard label="Average time to first offer" value="4 s" delta="vs 9 days by email" />
        <StatCard label="Passport tier" value="Tier 2" delta="1 trade to Tier 3" tone="warn" />
      </div>

      <Card className="p-0 overflow-hidden"><div className="p-6 pb-2"><CardHeader title="4. CheckRow" subtitle="collapsed, expanded, running, every result" className="mb-0" /></div>
        <CheckRow id={4} title="GST registration and filings" source="GST" mode="staged" state="pass" line="GSTIN active, last 12 returns filed (11 on time)." durationMs={1100} />
        <CheckRow id={7} title="Shipment tracking" source="Carrier" mode="staged" state="unknown" line="Carrier tracking not yet available. Forwarder confirmation requested." durationMs={1400} defaultExpanded />
        <CheckRow id={8} title="Cross-document consistency" source="Computed" mode="real" state="fail" line="Invoice quantity 4,800 does not match Bill of Lading quantity 4,200." durationMs={1800} onOpen={() => setDrawer(true)} />
        <CheckRow id={12} title="Duplicate-financing registry" source="Cashew registry" mode="real" state="warn" line="Possible duplicate. Similarity 0.87 to an invoice already financed." durationMs={1000} />
        <CheckRow id={13} title="Bank account ownership" source="Bank (penny drop)" mode="staged" state="running" />
        <CheckRow id={14} title="Buyer confirmation" source="Buyer confirmation" mode="staged" state="pending" line="Buyer has not yet confirmed. We sent a link." durationMs={400} />
      </Card>

      <Card><CardHeader title="5. Stepper" /><Stepper steps={['Trade details', 'Documents', 'Verification', 'Review and consent']} current={2} /></Card>

      <Card><CardHeader title="6. DocSlot" subtitle="empty, hover, scanning, extracted, needs review" />
        <div className="grid md:grid-cols-3 gap-4">
          <DocSlot label="Purchase Order" state="empty" onFile={() => toast({ tone: 'info', text: 'File received' })} />
          <DocSlot label="Commercial Invoice" state="hover" />
          <DocSlot label="Packing List" state="scanning" />
          <DocSlot label="Shipping Bill" state="extracted" fieldCount={11} fileName="B-shipping-bill.pdf" />
          <DocSlot label="Bill of Lading" state="review" fieldCount={11} reviewCount={1} fileName="B-bill-of-lading.pdf" />
        </div>
      </Card>

      <Card><CardHeader title="7–9. Drawer, Modal, Toast" />
        <div className="flex flex-wrap gap-3">
          <Button variant="secondary" onClick={() => setDrawer(true)}>Open drawer</Button>
          <Button variant="secondary" onClick={() => setModal(true)}>Open modal</Button>
          <Button variant="secondary" onClick={() => toast({ tone: 'success', text: 'Offer received from Tidewater Finance.' })}>Toast: success</Button>
          <Button variant="secondary" onClick={() => toast({ tone: 'warn', text: 'Hidden fee found in conditions.', action: { label: 'View', href: '/kit' } })}>Toast with action</Button>
          <Button variant="secondary" onClick={() => toast({ tone: 'danger', text: 'Cannot move trade from DRAFT to FINANCED.' })}>Toast: danger</Button>
        </div>
      </Card>

      <Card><CardHeader title="10. HashPill" /><div className="flex gap-3 flex-wrap"><HashPill value={H} label="Evidence reference" /><HashPill value={'7f3a91c2' + '0'.repeat(52) + 'c91e'} /></div></Card>

      <Card><CardHeader title="11. Timeline" />
        <Timeline steps={['Submitted', 'Verified', 'Offers', 'Financed', 'Shipped', 'Delivered', 'Repaid']} current={3} />
        <div className="mt-6 max-w-xs"><Timeline orientation="vertical" steps={['Booked', 'Loaded', 'Sailed', 'Arrived', 'Delivered']} current={2} notes={{ 0: '12 Oct', 1: '14 Oct' }} /></div>
      </Card>

      <Card><CardHeader title="12–13. DemoRibbon and DemoPanel" subtitle="The ribbon is fixed at the top of every page. Press D for the panel." />
        <Button variant="secondary" onClick={() => setDemoPanel(true)}>Open DemoPanel</Button></Card>

      <Card><CardHeader title="14. EmptyState" /><EmptyState text="No trades yet. Start with your first invoice." action={<Button>New trade</Button>} /></Card>

      <Card><CardHeader title="Form fields" /><div className="grid md:grid-cols-3 gap-4"><div><Label htmlFor="k1">Input</Label><Input id="k1" placeholder="USD 30,000" /></div><div><Label htmlFor="k2">Select</Label><Select id="k2"><option>FOB</option><option>CIF</option></Select></div></div></Card>

      <Drawer open={drawer} onClose={() => setDrawer(false)} title="Evidence" subtitle="Check 8 · Cross-document consistency" footer={<HashPill value={H} label="Evidence reference" />}>
        <p className="text-sm text-ink-2">Drawer content (480px, scrim 24% ink).</p>
      </Drawer>
      <Modal open={modal} onClose={() => setModal(false)} title="Accept this offer" footer={<><Button variant="secondary" onClick={() => setModal(false)}>Cancel</Button><Button onClick={() => setModal(false)}>Confirm</Button></>}>
        <p className="text-sm text-ink-2">Modal content (560px, centred).</p>
      </Modal>
    </main>
  );
}
