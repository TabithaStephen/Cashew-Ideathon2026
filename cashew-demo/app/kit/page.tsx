'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Button } from '@/components/Button';
import { CheckRow } from '@/components/CheckRow';
import { DemoPanel, type DemoAction } from '@/components/DemoPanel';
import { DocSlot, type DocSlotState } from '@/components/DocSlot';
import { Drawer } from '@/components/Drawer';
import { EmptyState } from '@/components/EmptyState';
import { HashPill } from '@/components/HashPill';
import { Modal } from '@/components/Modal';
import { StatCard } from '@/components/StatCard';
import { StatusChip } from '@/components/StatusChip';
import { Stepper } from '@/components/Stepper';
import { Timeline, type Milestone } from '@/components/Timeline';
import { useToast } from '@/components/Toast';
import type { StatusKind } from '@/components/status';
import { formatINR } from '@/lib/format';

// Sample values only: this page shows the components, not a real trade.
const SAMPLE_HASH = '7f3a91c2d04e8b6a15f7c3e9a2d06b4f8e1c7a93b5d2064fe8a1c37b90d2c91e';
const KINDS: StatusKind[] = ['pass', 'fail', 'unknown', 'pending', 'running', 'warn', 'info'];
const STEPS = ['Parties', 'Documents', 'Checks', 'Share'];
const MILESTONES: Milestone[] = [
  { title: 'Loaded', detail: 'Container on board', at: '2 Oct 2026', state: 'done' },
  { title: 'Sailed', detail: 'Left Chennai', at: '4 Oct 2026', state: 'done' },
  { title: 'Arrived', detail: 'Waiting at Felixstowe', state: 'current' },
  { title: 'Delivered', state: 'upcoming' },
];

function Section({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={`kit-${n}`} className="border-t-2 border-ink pt-3">
      <h2 id={`kit-${n}`} className="mb-3">
        <span className="mr-2 font-mono text-label text-ink-3">{String(n).padStart(2, '0')}</span>
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Variant({ name, children }: { name: string; children: ReactNode }) {
  return (
    <div>
      <p className="field-label mb-1">{name}</p>
      {children}
    </div>
  );
}

function LiveDocSlot() {
  const [state, setState] = useState<DocSlotState>('empty');
  const [name, setName] = useState<string>();
  const timer = useRef<number>();
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return (
    <DocSlot
      docName="Commercial Invoice"
      state={state}
      fileName={name}
      fieldCount={12}
      onFile={(file) => {
        setName(file.name);
        setState('scanning');
        timer.current = window.setTimeout(() => setState('extracted'), 1500);
      }}
      action={state === 'extracted' ? <Button size="compact" onClick={() => { setState('empty'); setName(undefined); }}>Replace</Button> : undefined}
    />
  );
}

export default function KitPage() {
  const toast = useToast();
  const [drawer, setDrawer] = useState(false);
  const [modal, setModal] = useState(false);
  const [panel, setPanel] = useState(false);
  const [saving, setSaving] = useState(false);
  const [replay, setReplay] = useState(0);
  const [runKey, setRunKey] = useState(0);
  const [lastAction, setLastAction] = useState<DemoAction | null>(null);
  const saveTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(saveTimer.current), []);

  const save = () => {
    setSaving(true);
    saveTimer.current = window.setTimeout(() => setSaving(false), 1500);
  };

  return (
    <main className="mx-auto flex max-w-content flex-col gap-8 px-4 py-6 pb-24 md:px-8">
      <header>
        <h1 className="text-display">Component kit</h1>
        <p className="mt-1 max-w-[68ch] text-ink-2">Every Cashew component in every state, in the Manifest identity. All values on this page are samples.</p>
      </header>

      <Section n={1} title="Button">
        <Variant name="Variants">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary">Share with 3 lenders</Button>
            <Button variant="secondary">Show the calculation</Button>
            <Button variant="ghost">Skip for now</Button>
            <Button variant="danger">Reject trade</Button>
          </div>
        </Variant>
        <Variant name="Compact (44px on phones)">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" size="compact">Accept</Button>
            <Button variant="secondary" size="compact">Replace</Button>
            <Button variant="ghost" size="compact">Skip</Button>
            <Button variant="danger" size="compact">Reject</Button>
          </div>
        </Variant>
        <Variant name="Loading and disabled">
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="primary" loading={saving} onClick={save}>{saving ? 'Saving' : 'Click to load'}</Button>
            <Button variant="primary" loading>Sharing</Button>
            <Button variant="secondary" loading>Loading</Button>
            <Button variant="danger" loading>Rejecting</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </div>
        </Variant>
      </Section>

      <Section n={2} title="StatusChip">
        <div className="flex flex-wrap gap-2">
          {KINDS.map((kind) => <StatusChip key={kind} kind={kind} />)}
          <StatusChip kind="info">Simulated</StatusChip>
        </div>
      </Section>

      <Section n={3} title="StatCard">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard key={`a${replay}`} countUp label="Cash in hand" value={2231250} format={formatINR} delta="₹2,10,000 more than last month" deltaTone="pass" deltaDirection="up" />
          <StatCard key={`b${replay}`} countUp label="Open trades" value={7} delta="3 waiting on a buyer" />
          <StatCard label="Effective cost" value="12.93%" delta="1.2 points lower" deltaTone="pass" deltaDirection="down" />
          <StatCard label="Evidence strength" value="Moderate" delta="3 checks are still open" deltaTone="warn" />
        </div>
        <div><Button size="compact" onClick={() => setReplay(replay + 1)}>Replay count-up</Button></div>
      </Section>

      <Section n={4} title="CheckRow">
        <div className="flex justify-end"><Button size="compact" onClick={() => setRunKey(runKey + 1)}>Replay tick</Button></div>
        <div className="border border-rule border-t-2 border-t-ink">
          <CheckRow key={runKey} drawTick title="GST status" source="GSTN (simulated)" result="GSTIN active, last 12 returns filed (11 on time)." status="pass" duration="1.2s">
            Collapsed by default. Open it to see the evidence.
          </CheckRow>
          <CheckRow defaultOpen title="Documents agree" source="Your documents" result="Invoice quantity 4,800 does not match Bill of Lading quantity 4,200." status="fail" duration="0.4s">
            Expanded: 600 pcs were not shipped. The invoice may overstate the goods by USD 3,750.
          </CheckRow>
          <CheckRow title="Carrier tracking" source="Carrier (simulated)" result="Carrier tracking isn't available yet. We asked your forwarder." status="unknown" duration="2.0s">
            Unknown is a valid result, and it stays visible.
          </CheckRow>
          <CheckRow title="Buyer confirmation" source="Buyer" result="Buyer has not yet confirmed. We sent a link." status="pending" />
          <CheckRow title="Sanctions screening" source="Lists (simulated)" result="Checking now." status="running" />
          <CheckRow title="Payment terms" source="Your documents" result="Terms differ slightly from the purchase order." status="warn" duration="0.3s">
            Needs attention, but doesn't block the trade.
          </CheckRow>
        </div>
      </Section>

      <Section n={5} title="Stepper">
        {[0, 2, 3].map((current) => (
          <Variant key={current} name={`Step ${current + 1} of ${STEPS.length}`}>
            <Stepper steps={STEPS} current={current} label={`Example at step ${current + 1}`} />
          </Variant>
        ))}
      </Section>

      <Section n={6} title="DocSlot">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Variant name="Empty"><DocSlot docName="Commercial Invoice" state="empty" /></Variant>
          <Variant name="Hover"><DocSlot docName="Packing List" state="hover" /></Variant>
          <Variant name="Scanning"><DocSlot docName="Shipping Bill" state="scanning" fileName="shipping-bill.pdf" /></Variant>
          <Variant name="Extracted"><DocSlot docName="Bill of Lading" state="extracted" fileName="bill-of-lading.pdf" fieldCount={12} /></Variant>
          <Variant name="Needs review"><DocSlot docName="Purchase Order" state="needs-review" fileName="purchase-order.pdf" reviewCount={2} action={<Button size="compact">Review</Button>} /></Variant>
          <Variant name="Try it (reading is simulated; the file stays on your computer)"><LiveDocSlot /></Variant>
        </div>
      </Section>

      <Section n={7} title="Drawer">
        <div><Button onClick={() => setDrawer(true)}>Open drawer</Button></div>
      </Section>

      <Section n={8} title="Modal">
        <div><Button onClick={() => setModal(true)}>Open modal</Button></div>
      </Section>

      <Section n={9} title="Toast">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => toast('Passport shared with the lender.', { tone: 'pass' })}>Success</Button>
          <Button onClick={() => toast('Couldn’t load this. Your documents are safe.', { tone: 'fail' })}>Error</Button>
          <Button onClick={() => toast('Lender responses are simulated.')}>Info</Button>
          <Button onClick={() => toast('Offer declined.', { tone: 'warn', action: { label: 'Undo', onClick: () => toast('Offer restored.', { tone: 'pass' }) } })}>With action</Button>
          <Button
            onClick={() => {
              toast('First in the stack.', { tone: 'pass' });
              toast('Second in the stack.');
              toast('Third in the stack.', { tone: 'warn' });
            }}
          >
            Stack of three
          </Button>
        </div>
      </Section>

      <Section n={10} title="HashPill">
        <div className="flex flex-wrap items-center gap-2"><HashPill hash={SAMPLE_HASH} label="invoice fingerprint" /></div>
      </Section>

      <Section n={11} title="Timeline">
        <Variant name="Vertical"><div className="border border-rule border-t-2 border-t-ink bg-sheet p-4"><Timeline items={MILESTONES} label="Example vertical timeline" /></div></Variant>
        <Variant name="Horizontal (vertical on phones)"><div className="border border-rule border-t-2 border-t-ink bg-sheet p-4"><Timeline items={MILESTONES} orientation="horizontal" label="Example horizontal timeline" /></div></Variant>
      </Section>

      <Section n={12} title="DemoRibbon">
        <p className="text-table text-ink-2">Fixed to the top of this page, on every route.</p>
      </Section>

      <Section n={13} title="DemoPanel">
        <div className="flex flex-wrap items-center gap-3">
          <Button aria-pressed={panel} onClick={() => setPanel(!panel)}>{panel ? 'Close demo controls' : 'Open demo controls'}</Button>
          <span className="text-table text-ink-2">Or press D. Controls change nothing yet; they are connected in Phase 9.</span>
        </div>
        <p className="text-table" role="status">
          <span className="field-label mr-2">Last control</span>
          {lastAction ? <code className="font-mono text-label">{JSON.stringify(lastAction)}</code> : 'None'}
        </p>
      </Section>

      <Section n={14} title="EmptyState">
        <EmptyState message="No offers yet. Lenders see your trade after you share it." actionLabel="Share with 3 lenders" onAction={() => toast('Sharing is connected in Phase 5.')} />
      </Section>

      <Drawer
        open={drawer}
        onClose={() => setDrawer(false)}
        title="Evidence"
        footer={<Button variant="primary" onClick={() => setDrawer(false)}>Done</Button>}
      >
        <div className="flex flex-col items-start gap-3">
          <p>Invoice quantity 4,800 does not match Bill of Lading quantity 4,200.</p>
          <HashPill hash={SAMPLE_HASH} label="evidence reference" />
          <p className="text-table text-ink-2">Copy the hash to check the toast still shows above the drawer. Press Esc to close, or open a modal on top.</p>
          <Button onClick={() => setModal(true)}>Open modal on top</Button>
        </div>
      </Drawer>

      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title="Accept this offer?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={() => setModal(false)}>Accept</Button>
          </>
        }
      >
        <p>Sample offer. Tab stays inside this box, Esc closes it, and focus returns to the button that opened it.</p>
      </Modal>

      <DemoPanel open={panel} onOpenChange={setPanel} onAction={setLastAction} />
    </main>
  );
}
