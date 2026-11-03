'use client';
import { useState } from 'react';
import { Modal } from '@/components/Overlay';
import { Button } from '@/components/Button';
import { DocSlot } from '@/components/DocSlot';
import { api } from '@/lib/client';
import { scaled, useUI } from '@/lib/ui-store';

/** Upload a corrected invoice, then re-run check 8 only (history is appended, not overwritten). */
export function AmendModal({ tradeId, open, onClose, sampleFile }: { tradeId: string; open: boolean; onClose: () => void; sampleFile?: string }) {
  const [state, setState] = useState<'empty' | 'scanning' | 'extracted'>('empty');
  const speed = useUI((s) => s.speed);
  const upload = async (file: File) => {
    setState('scanning');
    const form = new FormData();
    form.set('file', file); form.set('type', 'invoice'); form.set('amended', 'true');
    try {
      await api(`/api/trades/${tradeId}/documents`, { form });
      await new Promise((r) => setTimeout(r, scaled(1800, speed)));
      setState('extracted');
      await api(`/api/trades/${tradeId}/verify`, { json: { checkId: 8 } });
      useUI.getState().toast({ tone: 'info', text: 'Corrected invoice received. Re-running check 8.' });
      setTimeout(() => { onClose(); setState('empty'); }, scaled(500, speed));
    } catch { setState('empty'); }
  };
  const useSample = async () => {
    const name = sampleFile ?? 'B-commercial-invoice-amended.pdf';
    const blob = await fetch(`/sample-docs/${name}`).then((r) => r.blob());
    upload(new File([blob], name, { type: 'application/pdf' }));
  };
  return (
    <Modal open={open} onClose={onClose} title="Upload corrected document">
      <p className="text-sm text-ink-2 mb-4">Upload the amended Commercial Invoice. Only check 8 re-runs; the earlier result stays in the history.</p>
      <DocSlot label="Amended Commercial Invoice" state={state} fieldCount={13} fileName="Amended invoice" onFile={upload} />
      <div className="flex justify-between items-center mt-4">
        <span className="text-caption text-ink-3">Demo: use the prepared amended invoice</span>
        <Button variant="secondary" onClick={useSample} disabled={state !== 'empty'}>Use sample corrected invoice</Button>
      </div>
    </Modal>
  );
}
