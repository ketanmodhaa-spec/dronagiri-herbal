'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { adminPost } from '@/lib/admin/admin-post';

/** "Check status" on a processing refund — asks Razorpay, then refreshes. */
export function RefundSyncButton({ orderId, refundId }: { orderId: string; refundId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check() {
    setBusy(true);
    setError(null);
    const result = await adminPost(`/api/admin/orders/${orderId}/refunds/${refundId}/sync`);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={() => void check()}
        disabled={busy}
        className="text-xs font-medium text-forest-700 underline underline-offset-2 disabled:opacity-50"
      >
        {busy ? 'Checking…' : 'Check status'}
      </button>
      {error && <span className="text-xs text-red-700">{error}</span>}
    </span>
  );
}
