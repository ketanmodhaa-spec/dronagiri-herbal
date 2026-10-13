'use client';

/**
 * Pay button — opens Razorpay's checkout widget for one order and reports the
 * result back to /api/payment/verify.
 *
 * Takes the server's `PaymentHandoff` as-is: the amount, Razorpay order and
 * key all come from the server; this component only displays and forwards.
 * The checkout script is loaded on first click, not on page load, so pages
 * that never take a payment never fetch it.
 */
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { formatPrice } from '@/lib/format';
import type { PaymentHandoff, SettlementResult } from '@/lib/payments/payment-service';

const CHECKOUT_SCRIPT_URL = 'https://checkout.razorpay.com/v1/checkout.js';

/** The subset of Razorpay's checkout options this component sets. */
interface RazorpayCheckoutOptions {
  key: string;
  order_id: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  prefill: { name: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpaySuccess) => void;
  modal: { ondismiss: () => void };
}

interface RazorpaySuccess {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayFailure {
  error: { description?: string };
}

interface RazorpayInstance {
  open(): void;
  on(event: 'payment.failed', callback: (response: RazorpayFailure) => void): void;
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => RazorpayInstance;
  }
}

let scriptPromise: Promise<void> | undefined;

/** Load checkout.js once per page; a failed load can be retried. */
function loadCheckoutScript(): Promise<void> {
  if (window.Razorpay) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = CHECKOUT_SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      script.remove();
      scriptPromise = undefined;
      reject(new Error('Razorpay checkout failed to load'));
    };
    document.body.appendChild(script);
  });
  return scriptPromise;
}

type PayState =
  | { kind: 'idle' }
  | { kind: 'opening' }
  | { kind: 'verifying' }
  | { kind: 'done'; result: SettlementResult }
  | { kind: 'error'; message: string };

interface VerifyResponse {
  data?: SettlementResult;
  error?: { message: string };
}

async function verifyPayment(response: RazorpaySuccess): Promise<SettlementResult> {
  const res = await fetch('/api/payment/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      razorpayOrderId: response.razorpay_order_id,
      razorpayPaymentId: response.razorpay_payment_id,
      razorpaySignature: response.razorpay_signature,
    }),
  });
  const body = (await res.json().catch(() => ({}))) as VerifyResponse;
  if (!res.ok || !body.data) {
    throw new Error(body.error?.message ?? 'We could not confirm your payment.');
  }
  return body.data;
}

export function RazorpayPayButton({
  handoff,
  onSettled,
}: {
  handoff: PaymentHandoff;
  /** Called once the server has confirmed the payment. */
  onSettled?: (result: SettlementResult) => void;
}) {
  const [state, setState] = useState<PayState>({ kind: 'idle' });

  async function pay(): Promise<void> {
    setState({ kind: 'opening' });
    try {
      await loadCheckoutScript();
    } catch {
      setState({ kind: 'error', message: 'The payment window could not load. Check your connection and try again.' });
      return;
    }
    if (!window.Razorpay) {
      setState({ kind: 'error', message: 'The payment window could not load. Please try again.' });
      return;
    }

    const checkout = new window.Razorpay({
      key: handoff.keyId,
      order_id: handoff.razorpayOrderId,
      amount: handoff.amountPaise,
      currency: handoff.currency,
      name: 'Dronagiri Herbal',
      description: `Order ${handoff.orderNumber}`,
      prefill: handoff.prefill,
      theme: { color: '#1F5C3A' },
      handler: (response) => {
        setState({ kind: 'verifying' });
        verifyPayment(response)
          .then((result) => {
            setState({ kind: 'done', result });
            onSettled?.(result);
          })
          .catch((error: unknown) => {
            setState({
              kind: 'error',
              message:
                error instanceof Error
                  ? `${error.message} If money was debited, your order will still be confirmed — we will message you.`
                  : 'We could not confirm your payment.',
            });
          });
      },
      modal: { ondismiss: () => setState((current) => (current.kind === 'opening' ? { kind: 'idle' } : current)) },
    });
    // Razorpay keeps the widget open after a failed attempt so the customer
    // can retry there; the message here is only a hint behind it.
    checkout.on('payment.failed', (response) => {
      setState({
        kind: 'error',
        message: response.error.description ?? 'The payment did not go through. You can try again.',
      });
    });
    checkout.open();
  }

  if (state.kind === 'done') {
    return (
      <p role="status" className="font-body text-forest-900">
        {state.result.outcome === 'NEEDS_ATTENTION'
          ? `Payment received for order ${state.result.orderNumber}. We will contact you shortly to confirm it.`
          : `Payment received — order ${state.result.orderNumber} is confirmed.`}
      </p>
    );
  }

  const busy = state.kind === 'opening' || state.kind === 'verifying';
  return (
    <div className="flex flex-col gap-3">
      <Button size="lg" onClick={() => void pay()} disabled={busy}>
        {state.kind === 'verifying' ? 'Confirming payment…' : `Pay ${formatPrice(handoff.amountPaise)}`}
      </Button>
      {state.kind === 'error' && (
        <p role="alert" className="font-body text-sm text-red-700">
          {state.message}
        </p>
      )}
    </div>
  );
}
