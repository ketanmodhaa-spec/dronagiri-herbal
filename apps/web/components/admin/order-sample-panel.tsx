'use client';

/**
 * The surprise-sample reminder on a loyal customer's order. The system
 * decides who has earned one; the packer chooses what goes in and records it
 * here, so it shows on the order history and is never forgotten or doubled.
 */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { adminPost } from '@/lib/admin/admin-post';

interface OrderSamplePanelProps {
  orderId: string;
  /** e.g. "4th order · ₹1,796 spent since Oct 2026". */
  loyaltySummary: string;
  sampleNote: string | null;
  /** False once the parcel has shipped — too late to add one. */
  canStillAdd: boolean;
}

export function OrderSamplePanel({ orderId, loyaltySummary, sampleNote, canStillAdd }: OrderSamplePanelProps) {
  const router = useRouter();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await adminPost(`/api/admin/orders/${orderId}/actions`, { action: 'SAMPLE', note });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  if (sampleNote) {
    return (
      <section className="rounded-2xl border border-forest-200 bg-forest-50 p-4 text-sm text-forest-900">
        <p className="font-semibold">🎁 Surprise sample added</p>
        <p className="mt-0.5">{sampleNote}</p>
        <p className="mt-1 text-xs text-stone">Loyal customer — {loyaltySummary}</p>
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-gold bg-gold-light/30 p-4">
      <p className="text-sm font-semibold text-forest-900">🎁 Loyal customer — add a surprise sample</p>
      <p className="mt-0.5 text-sm text-forest-900">{loyaltySummary}</p>
      {canStillAdd ? (
        <form onSubmit={submit} noValidate className="mt-3 flex flex-wrap items-end gap-2">
          <div className="min-w-[200px] flex-1">
            <TextField
              label="Which sample went in?"
              name="sampleNote"
              placeholder="e.g. Rose toner 10 ml"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Sample added'}
          </Button>
        </form>
      ) : (
        <p className="mt-2 text-xs text-stone">The parcel has already shipped — remember them next time.</p>
      )}
      {error && (
        <p role="alert" className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
