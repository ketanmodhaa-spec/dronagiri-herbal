'use client';

/**
 * Top-of-page controls for one product: whether it is live in the shop, a
 * one-tap Hide / Show, and — for the owner — a two-step permanent Delete.
 *
 * Hiding is the normal way to delist. Delete exists for mistaken, duplicate
 * or test entries; the server refuses it for anything ever ordered or
 * reviewed, and this panel then offers to hide the product instead.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { adminPost } from '@/lib/admin/admin-post';

interface ProductVisibilityPanelProps {
  productId: string;
  productName: string;
  isActive: boolean;
  /** Owner accounts only — the server enforces this too. */
  canDelete: boolean;
}

type DeleteResult = { ok: true } | { ok: false; message: string; hasHistory: boolean };

async function deleteProductRequest(productId: string): Promise<DeleteResult> {
  try {
    const response = await fetch(`/api/admin/products/${productId}`, { method: 'DELETE' });
    if (response.ok) return { ok: true };
    const payload = (await response.json().catch(() => null)) as
      | { error?: { code?: string; message?: string } }
      | null;
    return {
      ok: false,
      message: payload?.error?.message ?? 'Could not delete the product. Please try again.',
      hasHistory: payload?.error?.code === 'PRODUCT_HAS_HISTORY',
    };
  } catch {
    return { ok: false, message: 'Could not reach the server. Check your connection and try again.', hasHistory: false };
  }
}

export function ProductVisibilityPanel({
  productId,
  productName,
  isActive,
  canDelete,
}: ProductVisibilityPanelProps) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offerHide, setOfferHide] = useState(false);

  async function setVisibility(next: boolean) {
    setBusy(true);
    setError(null);
    setOfferHide(false);
    const result = await adminPost<{ isActive: boolean }>(
      `/api/admin/products/${productId}/visibility`,
      { isActive: next },
    );
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    router.refresh();
  }

  async function remove() {
    setBusy(true);
    setError(null);
    const result = await deleteProductRequest(productId);
    if (result.ok) {
      router.push('/admin/products');
      router.refresh();
      return;
    }
    setBusy(false);
    setConfirming(false);
    setError(result.message);
    setOfferHide(result.hasHistory && isActive);
  }

  return (
    <section className="rounded-2xl border border-forest-100 bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium text-forest-900">
          {isActive ? (
            <>
              <span aria-hidden className="mr-1.5 inline-block h-2 w-2 rounded-full bg-forest-600" />
              Live in the shop
            </>
          ) : (
            <>
              <span aria-hidden className="mr-1.5 inline-block h-2 w-2 rounded-full bg-stone" />
              Hidden — customers cannot see or buy it
            </>
          )}
        </p>
        <div className="flex gap-2">
          <Button
            variant={isActive ? 'secondary' : 'primary'}
            size="sm"
            disabled={busy}
            onClick={() => setVisibility(!isActive)}
          >
            {isActive ? 'Hide from shop' : 'Show in shop'}
          </Button>
          {canDelete && !confirming && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setError(null);
                setOfferHide(false);
                setConfirming(true);
              }}
              className="text-red-700 hover:bg-red-50"
            >
              Delete…
            </Button>
          )}
        </div>
      </div>

      {confirming && (
        <div className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
          <p>
            Delete <strong>{productName}</strong> permanently? Its photos and stock history are
            removed too. This cannot be undone.
          </p>
          <p className="mt-1 text-xs">
            Only possible if it was never ordered or reviewed. To take it off sale, use Hide instead.
          </p>
          <div className="mt-3 flex gap-2">
            <Button variant="secondary" size="sm" disabled={busy} onClick={() => setConfirming(false)}>
              Cancel
            </Button>
            <Button size="sm" disabled={busy} onClick={remove} className="bg-red-700 hover:bg-red-800 active:bg-red-900">
              {busy ? 'Deleting…' : 'Delete permanently'}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <p>{error}</p>
          {offerHide && (
            <Button size="sm" className="mt-2" disabled={busy} onClick={() => setVisibility(false)}>
              Hide it instead
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
