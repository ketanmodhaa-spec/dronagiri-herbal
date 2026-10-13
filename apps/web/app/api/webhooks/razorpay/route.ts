/**
 * Razorpay webhook receiver — POST /api/webhooks/razorpay.
 *
 * The safety net under the checkout handler: if the customer's browser dies
 * between paying and reporting back, Razorpay still tells us here, and the
 * order is confirmed all the same. Subscribe these events in Razorpay →
 * Settings → Webhooks: payment.authorized, payment.captured, order.paid,
 * payment.failed, refund.processed, refund.failed.
 *
 * Every body is HMAC-signed with the webhook secret and verified over the raw
 * bytes before anything is parsed. For payments only the id is taken from the
 * body — settlement re-reads the payment from Razorpay's API. Refund events
 * update the matching Refund row.
 *
 * Status codes drive Razorpay's retries:
 *   200 — handled, a duplicate, or an event we can never act on.
 *   401 — bad signature. 400 — malformed body.
 *   500 — a transient failure (database or Razorpay unreachable): Razorpay
 *         retries with backoff, which is exactly what a payment needs.
 */
import { type NextRequest } from 'next/server';

import { serverConfig } from '@/lib/config.server';
import { applyRefundWebhook } from '@/lib/orders/refund-service';
import { PaymentError } from '@/lib/payments/payment-error';
import { recordFailedPaymentAttempt, settleOnlinePayment } from '@/lib/payments/payment-service';
import type { RazorpayRefund } from '@/lib/payments/razorpay-client';
import { verifyWebhookSignature } from '@/lib/payments/razorpay-signature';
import { getRedis } from '@/lib/redis';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Razorpay retries for up to 24 hours; remember handled event ids a little longer. */
const EVENT_DEDUPE_TTL_SECONDS = 2 * 24 * 60 * 60;

interface PaymentEntity {
  id: string;
  order_id: string | null;
  error_description?: string | null;
}

interface RazorpayWebhookEvent {
  event: string;
  payload?: { payment?: { entity?: PaymentEntity }; refund?: { entity?: RazorpayRefund } };
}

const SETTLE_EVENTS = new Set(['payment.authorized', 'payment.captured', 'order.paid']);

const REFUND_EVENTS = new Set(['refund.processed', 'refund.failed']);

async function handle(event: RazorpayWebhookEvent): Promise<void> {
  const refund = event.payload?.refund?.entity;
  if (REFUND_EVENTS.has(event.event) && refund?.id) {
    await applyRefundWebhook(refund);
    return;
  }

  const payment = event.payload?.payment?.entity;
  if (!payment?.id) return;

  if (SETTLE_EVENTS.has(event.event)) {
    const result = await settleOnlinePayment({ razorpayPaymentId: payment.id, trigger: 'WEBHOOK' });
    console.info(`[razorpay-webhook] ${event.event} ${payment.id} → ${result.orderNumber} ${result.outcome}`);
    return;
  }

  if (event.event === 'payment.failed' && payment.order_id) {
    await recordFailedPaymentAttempt({
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
      reason: payment.error_description ?? null,
    });
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const rawBody = await req.text();
  const signature = req.headers.get('x-razorpay-signature');
  if (!verifyWebhookSignature(rawBody, signature, serverConfig.razorpay.webhookSecret)) {
    return new Response('Invalid signature', { status: 401 });
  }

  let event: RazorpayWebhookEvent;
  try {
    event = JSON.parse(rawBody) as RazorpayWebhookEvent;
  } catch {
    return new Response('Invalid JSON', { status: 400 });
  }

  // Razorpay may deliver an event more than once. Claim its id before
  // handling; release the claim on a transient failure so the retry runs.
  const eventId = req.headers.get('x-razorpay-event-id');
  const dedupeKey = eventId ? `rzp:webhook:${eventId}` : null;
  if (dedupeKey) {
    const claimed = await getRedis().set(dedupeKey, '1', { nx: true, ex: EVENT_DEDUPE_TTL_SECONDS });
    if (claimed === null) {
      return Response.json({ ok: true, duplicate: true });
    }
  }

  try {
    await handle(event);
  } catch (error) {
    if (error instanceof PaymentError) {
      // Permanent: not our order, wrong amount, a failed payment. A retry
      // would only fail the same way.
      console.warn(`[razorpay-webhook] ${event.event} not settled: ${error.code} — ${error.message}`);
      return Response.json({ ok: true, settled: false });
    }
    console.error(`[razorpay-webhook] ${event.event} failed — Razorpay will retry`, error);
    if (dedupeKey) {
      await getRedis()
        .del(dedupeKey)
        .catch((releaseError: unknown) => {
          console.error('[razorpay-webhook] could not release event claim', releaseError);
        });
    }
    return new Response('Temporary failure', { status: 500 });
  }

  return Response.json({ ok: true });
}
