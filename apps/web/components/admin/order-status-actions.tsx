'use client';

/**
 * The next step for an order, as one big button — plus the less common
 * actions (cancel, resolve) behind a second tap. Every action refreshes the
 * page from the server afterwards, so what Sarita sees is always the truth.
 */
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';

import type { OrderStatus, PaymentStatus } from '@dronagiri/db';

import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { adminPost } from '@/lib/admin/admin-post';
import { formatPrice } from '@/lib/format';

interface OrderStatusActionsProps {
  orderId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  attentionReason: string | null;
  isOwner: boolean;
  /** Paise the customer would get back on cancellation (paid online, not yet refunded). */
  refundOnCancelPaise: number;
}

type Panel = 'none' | 'ship' | 'cancel' | 'resolve';

const CANCELLABLE: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PACKED'];

export function OrderStatusActions(props: OrderStatusActionsProps) {
  const router = useRouter();
  const [panel, setPanel] = useState<Panel>('none');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [text, setText] = useState('');
  // One key per opened cancel form: a double tap or retry refunds once.
  const [cancelKey, setCancelKey] = useState(() => crypto.randomUUID());

  async function run(url: string, body: object, success?: (data: unknown) => string | null) {
    setBusy(true);
    setError(null);
    setNotice(null);
    const result = await adminPost<unknown>(url, body);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPanel('none');
    setText('');
    setNotice(success ? success(result.data) : null);
    router.refresh();
  }

  const act = (body: object) => run(`/api/admin/orders/${props.orderId}/actions`, body);

  function submitShip(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void act({ action: 'SHIP', courierName, trackingNumber });
  }

  function submitCancel(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void run(`/api/admin/orders/${props.orderId}/cancel`, { reason: text, idempotencyKey: cancelKey }, (data) => {
      const refund = (data as { refund: { amountPaise: number; status: string } | null }).refund;
      setCancelKey(crypto.randomUUID());
      if (!refund) return 'Order cancelled.';
      return refund.status === 'FAILED'
        ? 'Order cancelled, but the refund failed — see the refunds section.'
        : `Order cancelled. ${formatPrice(refund.amountPaise)} is being refunded to the customer.`;
    });
  }

  function submitResolve(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void act({ action: 'RESOLVE', note: text });
  }

  const held = props.status === 'PENDING' && props.paymentStatus === 'PAID';
  const canCancel = props.isOwner && CANCELLABLE.includes(props.status);

  return (
    <section className="rounded-2xl border border-forest-100 bg-white p-5">
      {props.attentionReason && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-800">Needs your attention</p>
          <p className="mt-1 text-sm text-red-800">{props.attentionReason}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {held && (
              <Button size="sm" disabled={busy} onClick={() => void act({ action: 'CONFIRM_HELD' })}>
                Stock is back — confirm order
              </Button>
            )}
            <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPanel('resolve')}>
              Mark as resolved
            </Button>
          </div>
        </div>
      )}

      {!props.attentionReason && (
        <div className="flex flex-wrap gap-2">
          {props.status === 'CONFIRMED' && (
            <Button size="lg" disabled={busy} onClick={() => void act({ action: 'PACK' })}>
              Mark packed
            </Button>
          )}
          {(props.status === 'CONFIRMED' || props.status === 'PACKED') && (
            <Button
              size="lg"
              variant={props.status === 'PACKED' ? 'primary' : 'secondary'}
              disabled={busy}
              onClick={() => setPanel('ship')}
            >
              Mark shipped
            </Button>
          )}
          {props.status === 'SHIPPED' && (
            <Button size="lg" disabled={busy} onClick={() => void act({ action: 'DELIVER' })}>
              Mark delivered
            </Button>
          )}
        </div>
      )}

      {panel === 'ship' && (
        <form onSubmit={submitShip} noValidate className="mt-4 space-y-3 border-t border-forest-100 pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              label="Courier"
              name="courierName"
              placeholder="e.g. Delhivery"
              value={courierName}
              onChange={(event) => setCourierName(event.target.value)}
            />
            <TextField
              label="Tracking (AWB) number"
              name="trackingNumber"
              value={trackingNumber}
              onChange={(event) => setTrackingNumber(event.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Save as shipped'}
            </Button>
            <Button variant="ghost" onClick={() => setPanel('none')}>
              Back
            </Button>
          </div>
        </form>
      )}

      {(panel === 'cancel' || panel === 'resolve') && (
        <form
          onSubmit={panel === 'cancel' ? submitCancel : submitResolve}
          noValidate
          className="mt-4 space-y-3 border-t border-forest-100 pt-4"
        >
          <TextField
            label={panel === 'cancel' ? 'Why is it being cancelled?' : 'What did you do about it?'}
            name="reason"
            value={text}
            onChange={(event) => setText(event.target.value)}
            hint={
              panel === 'cancel'
                ? 'Any stock this order took goes back on the shelf.'
                : 'Saved on the order history. The order leaves "Needs attention".'
            }
          />
          {panel === 'cancel' && props.refundOnCancelPaise > 0 && (
            <p className="rounded-lg bg-gold-light/40 px-3 py-2 text-sm text-forest-900">
              {formatPrice(props.refundOnCancelPaise)} will be refunded to the customer&rsquo;s original
              payment method straight away.
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>
              {busy
                ? 'Working…'
                : panel === 'cancel'
                  ? props.refundOnCancelPaise > 0
                    ? `Cancel and refund ${formatPrice(props.refundOnCancelPaise)}`
                    : 'Cancel order'
                  : 'Mark as resolved'}
            </Button>
            <Button variant="ghost" onClick={() => setPanel('none')}>
              Back
            </Button>
          </div>
        </form>
      )}

      {canCancel && panel === 'none' && (
        <button
          type="button"
          onClick={() => setPanel('cancel')}
          className="mt-4 block text-sm font-medium text-red-700 underline underline-offset-2"
        >
          Cancel this order
        </button>
      )}

      {error && (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="mt-4 rounded-lg bg-forest-100 px-3 py-2 text-sm text-forest-800">
          {notice}
        </p>
      )}
    </section>
  );
}
