'use client';

/**
 * Refund part or all of an order. Sarita chooses the amount (capped at what is
 * still refundable — the server enforces the same cap), a reason, and which
 * returned units go back on the shelf. A final confirmation names the amount.
 */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import { Button } from '@/components/ui/button';
import { SelectField } from '@/components/ui/select-field';
import { TextField } from '@/components/ui/text-field';
import { adminPost } from '@/lib/admin/admin-post';
import { formatPrice } from '@/lib/format';
import { REFUND_REASONS } from '@/lib/orders/order-labels';

interface RefundLine {
  productId: string;
  productName: string;
  /** Units this order still has out of stock — the most that can come back. */
  returnable: number;
}

interface OrderRefundFormProps {
  orderId: string;
  refundablePaise: number;
  /** Cash orders are refunded by transfer, with a reference, not through Razorpay. */
  isCashOrder: boolean;
  lines: RefundLine[];
}

const RUPEES = /^\d+(\.\d{1,2})?$/;

/** "149.50" → 14950. Null for anything that is not a plain rupee amount. */
function toPaise(rupees: string): number | null {
  const trimmed = rupees.trim();
  return RUPEES.test(trimmed) ? Math.round(Number(trimmed) * 100) : null;
}

export function OrderRefundForm({ orderId, refundablePaise, isCashOrder, lines }: OrderRefundFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [amount, setAmount] = useState((refundablePaise / 100).toString());
  const [reason, setReason] = useState<string>(REFUND_REASONS[0]);
  const [otherReason, setOtherReason] = useState('');
  const [reference, setReference] = useState('');
  const [restock, setRestock] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState(() => crypto.randomUUID());

  const amountPaise = toPaise(amount);
  const fullReason = reason === 'Other' ? otherReason.trim() : reason;

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (amountPaise === null || amountPaise < 100) {
      setError('Enter an amount in rupees, at least ₹1.');
      return;
    }
    if (amountPaise > refundablePaise) {
      setError(`At most ${formatPrice(refundablePaise)} can be refunded.`);
      return;
    }
    if (fullReason.length < 3) {
      setError('Add a short reason.');
      return;
    }
    setConfirming(true);
  }

  async function submit() {
    if (amountPaise === null) return;
    setBusy(true);
    setError(null);
    const result = await adminPost<{ refund: { status: string; failureReason: string | null } }>(
      `/api/admin/orders/${orderId}/refunds`,
      {
        amountPaise,
        reason: fullReason,
        restock: lines
          .map((line) => ({ productId: line.productId, quantity: Number(restock[line.productId] ?? 0) }))
          .filter((line) => line.quantity > 0),
        manualReference: isCashOrder ? reference.trim() : undefined,
        idempotencyKey,
      },
    );
    setBusy(false);
    setConfirming(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (result.data.refund.status === 'FAILED') {
      setError(`Razorpay refused the refund: ${result.data.refund.failureReason ?? 'no reason given'}`);
    } else {
      setOpen(false);
    }
    setIdempotencyKey(crypto.randomUUID());
    router.refresh();
  }

  if (!open) {
    return (
      <Button variant="secondary" onClick={() => setOpen(true)}>
        Issue a refund
      </Button>
    );
  }

  const returnableLines = lines.filter((line) => line.returnable > 0);

  return (
    <form onSubmit={review} noValidate className="space-y-4 rounded-xl border border-forest-200 bg-forest-50 p-4">
      <TextField
        label="Amount to refund (₹)"
        name="amount"
        inputMode="decimal"
        value={amount}
        onChange={(event) => {
          setAmount(event.target.value);
          setConfirming(false);
        }}
        hint={`Up to ${formatPrice(refundablePaise)} can still be refunded.`}
      />
      <SelectField
        label="Reason"
        name="reason"
        value={reason}
        onChange={(event) => {
          setReason(event.target.value);
          setConfirming(false);
        }}
      >
        {REFUND_REASONS.map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </SelectField>
      {reason === 'Other' && (
        <TextField
          label="Describe the reason"
          name="otherReason"
          value={otherReason}
          onChange={(event) => setOtherReason(event.target.value)}
        />
      )}

      {returnableLines.length > 0 && (
        <fieldset>
          <legend className="text-sm font-medium text-forest-900">Back on the shelf</legend>
          <p className="mb-2 text-xs text-stone">
            Only unopened, sealed units that came back. Leave at 0 for damaged or used items.
          </p>
          <div className="space-y-2">
            {returnableLines.map((line) => (
              <label key={line.productId} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-forest-900">{line.productName}</span>
                <select
                  value={restock[line.productId] ?? '0'}
                  onChange={(event) => setRestock({ ...restock, [line.productId]: event.target.value })}
                  className="h-9 rounded-lg border border-forest-200 bg-white px-2 text-sm"
                >
                  {Array.from({ length: line.returnable + 1 }, (_, quantity) => (
                    <option key={quantity} value={quantity}>
                      {quantity}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {isCashOrder && (
        <TextField
          label="UPI / bank transfer reference"
          name="reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          hint="Cash orders can't be refunded through Razorpay. Send the money by UPI or bank transfer first, then record the reference here."
        />
      )}

      {error && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {confirming && amountPaise !== null ? (
        <div className="space-y-3 rounded-lg border border-gold bg-white p-3">
          <p className="text-sm text-forest-900">
            {isCashOrder
              ? `Record a ${formatPrice(amountPaise)} refund paid by transfer?`
              : `Refund ${formatPrice(amountPaise)} to the customer's original payment method? This cannot be undone.`}
          </p>
          <div className="flex gap-2">
            <Button disabled={busy} onClick={() => void submit()}>
              {busy ? 'Refunding…' : `Yes, refund ${formatPrice(amountPaise)}`}
            </Button>
            <Button variant="ghost" disabled={busy} onClick={() => setConfirming(false)}>
              Back
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Button type="submit">Review refund</Button>
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      )}
    </form>
  );
}
