'use client';

/**
 * Send free replacements for damaged or wrong items. Creates a linked ₹0
 * order in the packing queue and opens it.
 */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { adminPost } from '@/lib/admin/admin-post';

interface ReplacementLine {
  productId: string;
  productName: string;
  quantity: number;
}

export function OrderReplacementForm({ orderId, lines }: { orderId: string; lines: ReplacementLine[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await adminPost<{ replacement: { id: string } }>(`/api/admin/orders/${orderId}/replacements`, {
      lines: lines
        .map((line) => ({ productId: line.productId, quantity: Number(quantities[line.productId] ?? 0) }))
        .filter((line) => line.quantity > 0),
      reason,
    });
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.push(`/admin/orders/${result.data.replacement.id}`);
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Send a replacement
      </Button>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-4 rounded-xl border border-forest-200 bg-forest-50 p-4">
      <fieldset>
        <legend className="text-sm font-medium text-forest-900">Items to send again, free</legend>
        <div className="mt-2 space-y-2">
          {lines.map((line) => (
            <label key={line.productId} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-forest-900">{line.productName}</span>
              <select
                value={quantities[line.productId] ?? '0'}
                onChange={(event) => setQuantities({ ...quantities, [line.productId]: event.target.value })}
                className="h-9 rounded-lg border border-forest-200 bg-white px-2 text-sm"
              >
                {Array.from({ length: line.quantity + 1 }, (_, quantity) => (
                  <option key={quantity} value={quantity}>
                    {quantity}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>
      <TextField
        label="Reason"
        name="replacementReason"
        placeholder="e.g. Bottle arrived leaking"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        hint="A new ₹0 order is created and goes into the packing queue."
      />
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={busy}>
          {busy ? 'Creating…' : 'Create replacement order'}
        </Button>
        <Button variant="ghost" onClick={() => setOpen(false)}>
          Close
        </Button>
      </div>
    </form>
  );
}
