'use client';

import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';

interface StockEditorProps {
  productId: string;
  currentStock: number;
  lowStockThreshold: number;
}

/**
 * Adjust a product's stock. The admin enters the new total count; the server
 * derives the delta and records one ledger movement.
 */
export function StockEditor({ productId, currentStock, lowStockThreshold }: StockEditorProps) {
  const router = useRouter();
  const [newCount, setNewCount] = useState(String(currentStock));
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const low = currentStock <= lowStockThreshold;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);
    setSubmitting(true);
    try {
      const response = await fetch(`/api/admin/products/${productId}/stock`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          newCount: Number(newCount),
          note: note.trim() ? note.trim() : undefined,
        }),
      });
      const result = (await response.json().catch(() => null)) as
        | { data?: { stock?: { newQty: number; delta: number } }; error?: { message?: string } }
        | null;

      if (response.ok && result?.data?.stock) {
        const { newQty, delta } = result.data.stock;
        setMessage(
          delta === 0
            ? 'Stock unchanged.'
            : `Stock set to ${newQty} (${delta > 0 ? '+' : ''}${delta}).`,
        );
        setNote('');
        router.refresh();
      } else {
        setError(result?.error?.message ?? 'Could not update stock. Please try again.');
      }
    } catch {
      setError('Could not reach the server. Check your connection and try again.');
    }
    setSubmitting(false);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="space-y-4 rounded-2xl border border-forest-100 bg-white p-6"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-lg font-semibold text-forest-900">Stock</h2>
        <span className={low ? 'text-sm font-medium text-amber-700' : 'text-sm text-stone'}>
          In stock: {currentStock}
          {low ? ' — low' : ''}
        </span>
      </div>
      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="rounded-lg bg-forest-100 px-3 py-2 text-sm text-forest-800">
          {message}
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField
          label="New stock count"
          type="number"
          min="0"
          value={newCount}
          onChange={(e) => setNewCount(e.target.value)}
          required
        />
        <TextField
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </div>
      <p className="text-xs text-stone">
        Enter the new total count — the change is recorded in the stock ledger.
      </p>
      <Button type="submit" disabled={submitting}>
        {submitting ? 'Updating…' : 'Update stock'}
      </Button>
    </form>
  );
}
