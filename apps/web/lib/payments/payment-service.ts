/**
 * Online payment service — everything between "this order should be paid
 * online" and "the order is paid and its stock is committed".
 *
 *   startOnlinePayment   Order → Razorpay order. The amount is the order's
 *                        server-computed total; the browser never sends one.
 *   settleOnlinePayment  A Razorpay payment id → a confirmed order. Called by
 *                        the checkout handler (/api/payment/verify) and by the
 *                        webhook; whichever arrives first does the work and the
 *                        other finds it done.
 *   recordFailedPaymentAttempt
 *                        A failed attempt, from the webhook. The order stays
 *                        open — the customer can try again.
 *
 * Settlement never trusts the caller about what was paid: it fetches the
 * payment from Razorpay and checks its order, amount and currency against
 * ours before anything is written. Node runtime only.
 */
import {
  MULTI_STEP_TRANSACTION,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  prisma,
  StockMovementReason,
  StockMovementSource,
  type DbTransaction,
} from '@dronagiri/db';

import { serverConfig } from '@/lib/config.server';
import { formatPrice } from '@/lib/format';
import { runAfterResponse } from '@/lib/notifications/background';
import { sendEmail } from '@/lib/notifications/email/client';
import { notifyOrderPaid } from '@/lib/notifications/order-notifications';
import { commitOrderStockInTx, describeShortages } from '@/lib/orders/order-stock';
import { SYSTEM_ACTOR } from '@/lib/orders/order-labels';
import { PaymentError } from '@/lib/payments/payment-error';
import {
  captureRazorpayPayment,
  createRazorpayOrder,
  fetchRazorpayPayment,
  RazorpayApiError,
  type RazorpayPayment,
} from '@/lib/payments/razorpay-client';

/** Razorpay's minimum charge: ₹1. */
const MIN_CHARGE_PAISE = 100;


/** Everything the browser needs to open the Razorpay checkout widget for one order. */
export interface PaymentHandoff {
  /** Public key id — safe in the browser; tells the widget which account to use. */
  keyId: string;
  razorpayOrderId: string;
  amountPaise: number;
  currency: 'INR';
  orderNumber: string;
  prefill: { name: string; contact: string };
}

/** Which surface reported the payment — recorded on the stock ledger. */
export type PaymentTrigger = 'CHECKOUT' | 'WEBHOOK';

/**
 * CONFIRMED          — paid, stock committed, order moved to CONFIRMED.
 * ALREADY_CONFIRMED  — this payment had already been settled; nothing changed.
 * NEEDS_ATTENTION    — money was taken but the order cannot simply proceed
 *                      (stock ran out, a second payment, or the order was no
 *                      longer open). Sarita is emailed; she restocks or refunds.
 */
export type SettlementOutcome = 'CONFIRMED' | 'ALREADY_CONFIRMED' | 'NEEDS_ATTENTION';

export interface SettlementResult {
  orderNumber: string;
  outcome: SettlementOutcome;
}

/* ─── Start ───────────────────────────────────────────────────────────── */

/**
 * Get (or create, once) the Razorpay order for one of our orders.
 *
 * A Razorpay order accepts repeated attempts until one succeeds, so a customer
 * who closes the widget and tries again reuses the same one. Two concurrent
 * calls may each create a Razorpay order; only the first is saved and both
 * callers get that one — the other is never paid and expires unused.
 */
export async function startOnlinePayment(orderId: string): Promise<PaymentHandoff> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentMethod: true,
      paymentStatus: true,
      totalPaise: true,
      razorpayOrderId: true,
      shipRecipientName: true,
      customer: { select: { phone: true } },
    },
  });
  if (!order) {
    throw new PaymentError('Order not found.', 'ORDER_NOT_FOUND');
  }
  if (
    order.paymentMethod !== PaymentMethod.ONLINE ||
    order.status !== OrderStatus.PENDING ||
    (order.paymentStatus !== PaymentStatus.PENDING && order.paymentStatus !== PaymentStatus.FAILED)
  ) {
    throw new PaymentError('This order is not awaiting online payment.', 'ORDER_NOT_PAYABLE');
  }
  if (!Number.isSafeInteger(order.totalPaise) || order.totalPaise < MIN_CHARGE_PAISE) {
    throw new PaymentError(`Order total ${order.totalPaise} paise cannot be charged.`, 'INVALID_AMOUNT');
  }

  let razorpayOrderId = order.razorpayOrderId;
  if (!razorpayOrderId) {
    const created = await createRazorpayOrder({
      amountPaise: order.totalPaise,
      receipt: order.orderNumber,
      notes: { orderId: order.id, orderNumber: order.orderNumber },
    });
    // Save only if no concurrent call saved one first.
    await prisma.order.updateMany({
      where: { id: order.id, razorpayOrderId: null },
      data: { razorpayOrderId: created.id },
    });
    const saved = await prisma.order.findUniqueOrThrow({
      where: { id: order.id },
      select: { razorpayOrderId: true },
    });
    // Just written above, by this call or a concurrent one.
    razorpayOrderId = saved.razorpayOrderId ?? created.id;
  }

  return {
    keyId: serverConfig.razorpay.keyId,
    razorpayOrderId,
    amountPaise: order.totalPaise,
    currency: 'INR',
    orderNumber: order.orderNumber,
    prefill: { name: order.shipRecipientName, contact: order.customer.phone },
  };
}

/* ─── Settle ──────────────────────────────────────────────────────────── */

/** True while the order can still accept a first payment. */
function isAwaitingPayment(order: { status: OrderStatus; paymentStatus: PaymentStatus }): boolean {
  return (
    order.status === OrderStatus.PENDING &&
    (order.paymentStatus === PaymentStatus.PENDING || order.paymentStatus === PaymentStatus.FAILED)
  );
}

/**
 * Capture an authorized payment. If capture is refused, the payment may have
 * been captured a moment ago by the other caller (handler vs webhook) or by
 * the account's auto-capture setting — re-read it before giving up.
 */
async function ensureCaptured(payment: RazorpayPayment): Promise<void> {
  if (payment.status === 'captured') return;
  try {
    await captureRazorpayPayment({ paymentId: payment.id, amountPaise: payment.amount });
  } catch (error) {
    if (!(error instanceof RazorpayApiError)) throw error;
    const current = await fetchRazorpayPayment(payment.id);
    if (current.status !== 'captured') throw error;
  }
}

/**
 * Settle a payment Razorpay reports, and confirm the order it pays for.
 *
 * Safe to call any number of times for the same payment, from either path.
 * Throws `PaymentError` when the payment cannot be accepted — not ours, the
 * wrong amount, failed, or for an order that is no longer open (an authorized
 * payment is then left uncaptured, and Razorpay returns it to the customer).
 */
export async function settleOnlinePayment(args: {
  razorpayPaymentId: string;
  /** The Razorpay order the caller expects — set by the checkout handler. */
  expectedRazorpayOrderId?: string;
  trigger: PaymentTrigger;
}): Promise<SettlementResult> {
  const payment = await fetchRazorpayPayment(args.razorpayPaymentId);

  if (
    !payment.order_id ||
    (args.expectedRazorpayOrderId !== undefined && payment.order_id !== args.expectedRazorpayOrderId)
  ) {
    throw new PaymentError('This payment does not belong to this order.', 'PAYMENT_ORDER_MISMATCH');
  }

  const order = await prisma.order.findFirst({
    where: { razorpayOrderId: payment.order_id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      paymentStatus: true,
      razorpayPaymentId: true,
      totalPaise: true,
    },
  });
  if (!order) {
    throw new PaymentError('No order matches this payment.', 'UNKNOWN_ORDER');
  }

  if (payment.amount !== order.totalPaise || payment.currency !== 'INR') {
    console.error(
      `[payments] amount mismatch on ${order.orderNumber}: payment ${payment.id} is ` +
        `${payment.amount} ${payment.currency}, order total is ${order.totalPaise} INR`,
    );
    throw new PaymentError('The payment amount does not match the order.', 'AMOUNT_MISMATCH');
  }

  if (order.paymentStatus === PaymentStatus.PAID && order.razorpayPaymentId === payment.id) {
    return { orderNumber: order.orderNumber, outcome: 'ALREADY_CONFIRMED' };
  }

  switch (payment.status) {
    case 'failed':
      throw new PaymentError(
        'Your payment did not go through. No money was taken — please try again.',
        'PAYMENT_FAILED',
      );
    case 'created':
      throw new PaymentError('The payment has not been completed yet.', 'PAYMENT_INCOMPLETE');
    case 'refunded':
      throw new PaymentError('This payment has already been refunded.', 'PAYMENT_REFUNDED');
    case 'authorized':
      // Not captured yet, so nothing is lost by refusing it — Razorpay returns
      // an uncaptured payment to the customer on its own.
      if (!isAwaitingPayment(order)) {
        throw new PaymentError(
          'This order can no longer be paid. Any amount debited will be returned automatically.',
          'ORDER_NOT_PAYABLE',
        );
      }
      await ensureCaptured(payment);
      break;
    case 'captured':
      break;
  }

  const result = await prisma.$transaction(
    (tx) =>
      confirmPaidOrderInTx(tx, { orderId: order.id, razorpayPaymentId: payment.id, trigger: args.trigger }),
    MULTI_STEP_TRANSACTION,
  );

  if (result.outcome === 'NEEDS_ATTENTION') {
    await alertOwner(order.id, order.orderNumber, payment, result.reason);
  }
  // Only the call that confirmed the order announces it — the other path finds it done.
  if (result.outcome === 'CONFIRMED') {
    runAfterResponse(`order ${order.orderNumber} paid`, () => notifyOrderPaid(order.id));
  }
  return { orderNumber: order.orderNumber, outcome: result.outcome };
}

/** Flag the order for Sarita and record why on its timeline. */
async function holdForAttention(
  tx: DbTransaction,
  orderId: string,
  status: OrderStatus,
  reason: string,
): Promise<void> {
  await tx.order.update({ where: { id: orderId }, data: { attentionReason: reason } });
  await tx.orderEvent.create({ data: { orderId, status, note: reason, createdBy: SYSTEM_ACTOR } });
}

type ConfirmResult =
  | { outcome: 'CONFIRMED' | 'ALREADY_CONFIRMED' }
  | { outcome: 'NEEDS_ATTENTION'; reason: string };

/**
 * Record a captured payment against its order and commit the stock — all in
 * the caller's transaction, under a row lock on the order so the handler and
 * the webhook cannot both confirm it.
 *
 * Stock is checked for every line before any line is taken: either the whole
 * order is committed, or none of it is and the order waits for Sarita.
 */
async function confirmPaidOrderInTx(
  tx: DbTransaction,
  args: { orderId: string; razorpayPaymentId: string; trigger: PaymentTrigger },
): Promise<ConfirmResult> {
  const [order] = await tx.$queryRaw<
    {
      status: OrderStatus;
      paymentStatus: PaymentStatus;
      razorpayPaymentId: string | null;
      customerId: string;
    }[]
  >`
    SELECT "status", "paymentStatus", "razorpayPaymentId", "customerId"
    FROM "Order" WHERE "id" = ${args.orderId} FOR UPDATE
  `;
  if (!order) {
    throw new PaymentError('Order not found.', 'ORDER_NOT_FOUND');
  }

  const now = new Date();

  if (order.paymentStatus === PaymentStatus.PAID) {
    if (order.razorpayPaymentId === args.razorpayPaymentId) {
      return { outcome: 'ALREADY_CONFIRMED' };
    }
    const reason =
      `A second payment (${args.razorpayPaymentId}) was captured for an order already paid by ` +
      `${order.razorpayPaymentId ?? 'another payment'}. Refund the second payment from the Razorpay dashboard.`;
    await holdForAttention(tx, args.orderId, order.status, reason);
    return { outcome: 'NEEDS_ATTENTION', reason };
  }

  const paid = { paymentStatus: PaymentStatus.PAID, razorpayPaymentId: args.razorpayPaymentId, paidAt: now };

  if (!isAwaitingPayment(order)) {
    const reason =
      `Payment ${args.razorpayPaymentId} was captured while the order was ${order.status}. ` +
      'Refund it, or reopen the order if it should still ship.';
    await tx.order.update({ where: { id: args.orderId }, data: paid });
    await holdForAttention(tx, args.orderId, order.status, reason);
    return { outcome: 'NEEDS_ATTENTION', reason };
  }

  const shortages = await commitOrderStockInTx(tx, {
    orderId: args.orderId,
    reason: StockMovementReason.SALE,
    source: args.trigger === 'WEBHOOK' ? StockMovementSource.WEBHOOK : StockMovementSource.ORDER,
    createdBy: SYSTEM_ACTOR,
  });

  if (shortages.length > 0) {
    const reason =
      `Paid, but not enough stock to fulfil: ${describeShortages(shortages)}. ` +
      'Restock and confirm, or refund the customer.';
    await tx.order.update({ where: { id: args.orderId }, data: paid });
    await holdForAttention(tx, args.orderId, OrderStatus.PENDING, reason);
    return { outcome: 'NEEDS_ATTENTION', reason };
  }

  await tx.order.update({
    where: { id: args.orderId },
    data: { ...paid, status: OrderStatus.CONFIRMED },
  });
  await tx.orderEvent.create({
    data: {
      orderId: args.orderId,
      status: OrderStatus.CONFIRMED,
      note: `Paid online — Razorpay payment ${args.razorpayPaymentId}.`,
      createdBy: SYSTEM_ACTOR,
    },
  });
  await tx.customer.update({ where: { id: order.customerId }, data: { lastOrderAt: now } });

  return { outcome: 'CONFIRMED' };
}

/** Email Sarita about a paid order that cannot simply proceed. Never throws. */
async function alertOwner(
  orderId: string,
  orderNumber: string,
  payment: RazorpayPayment,
  reason: string,
): Promise<void> {
  await sendEmail({
    to: serverConfig.email.ownerInbox,
    templateName: 'payment_needs_attention',
    orderId,
    subject: `Action needed — order ${orderNumber} is paid but on hold`,
    text: [
      `Order ${orderNumber} has been paid online, but it cannot be confirmed automatically.`,
      '',
      reason,
      '',
      `Amount: ${formatPrice(payment.amount)}`,
      `Razorpay payment: ${payment.id} (${payment.method})`,
      serverConfig.razorpay.isTestMode ? '\nTEST MODE — no real money moved.' : '',
    ].join('\n'),
  });
}

/* ─── Failed attempts ─────────────────────────────────────────────────── */

/**
 * Note a failed attempt on the order. The order stays PENDING and the same
 * Razorpay order accepts a retry, so this never closes anything — and a later
 * success always wins over an earlier failure.
 */
export async function recordFailedPaymentAttempt(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  reason: string | null;
}): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findFirst({
      where: { razorpayOrderId: args.razorpayOrderId },
      select: { id: true },
    });
    if (!order) return;

    // Conditional on the order still awaiting payment, so a settlement that
    // lands between the read and this write is never overwritten with FAILED.
    const { count } = await tx.order.updateMany({
      where: {
        id: order.id,
        status: OrderStatus.PENDING,
        paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
      },
      data: { paymentStatus: PaymentStatus.FAILED },
    });
    if (count === 0) return;

    await tx.orderEvent.create({
      data: {
        orderId: order.id,
        status: OrderStatus.PENDING,
        note: `Payment attempt ${args.razorpayPaymentId} failed${args.reason ? `: ${args.reason}` : ''}.`,
        createdBy: SYSTEM_ACTOR,
      },
    });
  });
}
