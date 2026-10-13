/**
 * Refund service — money back to a customer, in full or in part.
 *
 * The flow, for an online order:
 *   1. In one transaction under a lock on the order: check the amount against
 *      what is still refundable, write a PENDING Refund row, put returned
 *      goods back in stock. Nothing has left our account yet.
 *   2. Ask Razorpay to refund, passing our Refund id in the notes.
 *   3. Record what Razorpay said. A clear refusal marks the refund FAILED and
 *      flags the order; an unclear outcome (timeout, 5xx) leaves it PENDING —
 *      the webhook or the "Check status" button finds it by its notes later.
 *      Nothing is ever retried blindly, so a refund cannot be paid twice.
 *
 * Cash-on-delivery orders cannot be refunded through Razorpay: Sarita pays by
 * UPI or bank transfer and records the reference, which is PROCESSED at once.
 *
 * Pending + processed refunds can never add up to more than was paid.
 */
import {
  MULTI_STEP_TRANSACTION,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  prisma,
  RefundMethod,
  RefundStatus,
  StockMovementReason,
  StockMovementSource,
  type DbTransaction,
  type Refund,
} from '@dronagiri/db';

import { NotFoundError } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { OrderStateError } from '@/lib/orders/admin-order-service';
import { SYSTEM_ACTOR } from '@/lib/orders/order-labels';
import { restockOrderLinesInTx } from '@/lib/orders/order-stock';
import { PaymentError } from '@/lib/payments/payment-error';
import {
  createRazorpayRefund,
  listPaymentRefunds,
  RazorpayApiError,
  refundIdFromNotes,
  type RazorpayRefund,
} from '@/lib/payments/razorpay-client';

/** Razorpay's smallest refund: ₹1. */
const MIN_REFUND_PAISE = 100;

/** A refund with no Razorpay id this long after creation never reached Razorpay. */
const LOST_REQUEST_AFTER_MS = 2 * 60 * 1000;

const OPEN_OR_DONE: RefundStatus[] = [RefundStatus.PENDING, RefundStatus.PROCESSED];

export interface IssueRefundInput {
  orderId: string;
  amountPaise: number;
  reason: string;
  /** Returned goods to put back in stock — resellable units only. */
  restock: { productId: string; quantity: number }[];
  /** UPI / bank reference — required for cash-on-delivery orders. */
  manualReference?: string;
  /** From the admin form: a double tap or a retried request refunds once. */
  idempotencyKey: string;
  adminId: string;
}

/** Paise of this order still available to refund. */
async function refundableInTx(tx: DbTransaction, orderId: string, totalPaise: number): Promise<number> {
  const committed = await tx.refund.aggregate({
    where: { orderId, status: { in: OPEN_OR_DONE } },
    _sum: { amountPaise: true },
  });
  return totalPaise - (committed._sum.amountPaise ?? 0);
}

/** Refund part or all of an order. Returns the refund as it stands afterwards. */
export async function issueRefund(input: IssueRefundInput): Promise<Refund> {
  const { refund, razorpayPaymentId } = await prisma.$transaction(async (tx) => {
    const existing = await tx.refund.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
    if (existing) {
      return { refund: existing, razorpayPaymentId: null };
    }

    const [order] = await tx.$queryRaw<
      {
        status: OrderStatus;
        paymentStatus: PaymentStatus;
        paymentMethod: PaymentMethod;
        razorpayPaymentId: string | null;
        totalPaise: number;
      }[]
    >`
      SELECT "status", "paymentStatus", "paymentMethod", "razorpayPaymentId", "totalPaise"
      FROM "Order" WHERE "id" = ${input.orderId} FOR UPDATE
    `;
    if (!order) throw new NotFoundError('That order does not exist.');
    if (order.paymentStatus !== PaymentStatus.PAID) {
      throw new OrderStateError('Only a paid order can be refunded.');
    }

    const method = order.paymentMethod === PaymentMethod.ONLINE ? RefundMethod.RAZORPAY : RefundMethod.MANUAL;
    if (method === RefundMethod.RAZORPAY && !order.razorpayPaymentId) {
      throw new OrderStateError('This order has no Razorpay payment to refund.');
    }
    if (method === RefundMethod.MANUAL && !input.manualReference) {
      throw new PaymentError(
        'Cash orders are refunded by UPI or bank transfer — enter the transfer reference.',
        'REFERENCE_REQUIRED',
      );
    }

    const refundable = await refundableInTx(tx, input.orderId, order.totalPaise);
    if (input.amountPaise < MIN_REFUND_PAISE) {
      throw new PaymentError('The smallest refund is ₹1.', 'INVALID_AMOUNT');
    }
    if (input.amountPaise > refundable) {
      throw new PaymentError(
        `At most ${formatPrice(refundable)} can still be refunded on this order.`,
        'REFUND_EXCEEDS_PAID',
      );
    }

    const now = new Date();
    const created = await tx.refund.create({
      data: {
        orderId: input.orderId,
        amountPaise: input.amountPaise,
        method,
        status: method === RefundMethod.MANUAL ? RefundStatus.PROCESSED : RefundStatus.PENDING,
        processedAt: method === RefundMethod.MANUAL ? now : null,
        reason: input.reason,
        manualReference: input.manualReference ?? null,
        idempotencyKey: input.idempotencyKey,
        createdBy: input.adminId,
      },
    });

    if (input.restock.length > 0) {
      await restockOrderLinesInTx(tx, {
        orderId: input.orderId,
        lines: input.restock,
        reason: StockMovementReason.RETURN,
        source: StockMovementSource.ADMIN_PANEL,
        createdBy: input.adminId,
        note: `Returned — refund ${formatPrice(input.amountPaise)}`,
      });
    }

    const isFull = input.amountPaise === refundable;
    const dispatched = order.status === OrderStatus.SHIPPED || order.status === OrderStatus.DELIVERED;
    const nextStatus =
      isFull && dispatched
        ? method === RefundMethod.MANUAL
          ? OrderStatus.REFUNDED
          : OrderStatus.REFUND_INITIATED
        : order.status;

    await tx.order.update({ where: { id: input.orderId }, data: { status: nextStatus } });
    await tx.orderEvent.create({
      data: {
        orderId: input.orderId,
        status: nextStatus,
        note:
          method === RefundMethod.MANUAL
            ? `Refunded ${formatPrice(input.amountPaise)} by transfer (ref ${input.manualReference}): ${input.reason}`
            : `Refund of ${formatPrice(input.amountPaise)} started: ${input.reason}`,
        createdBy: input.adminId,
      },
    });
    if (method === RefundMethod.MANUAL) {
      await settleOrderIfFullyRefundedInTx(tx, input.orderId);
    }

    return {
      refund: created,
      razorpayPaymentId: method === RefundMethod.RAZORPAY ? order.razorpayPaymentId : null,
    };
  }, MULTI_STEP_TRANSACTION);

  // Only a refund this call just created goes to Razorpay — a repeat of the
  // same idempotency key returns the existing row untouched.
  if (!razorpayPaymentId || refund.status !== RefundStatus.PENDING || refund.razorpayRefundId) {
    return refund;
  }

  try {
    const remote = await createRazorpayRefund({
      paymentId: razorpayPaymentId,
      amountPaise: refund.amountPaise,
      refundId: refund.id,
    });
    await applyRazorpayRefund(refund.id, remote);
  } catch (error) {
    if (error instanceof RazorpayApiError) {
      await failRefund(refund.id, error.description);
    } else {
      // Outcome unknown — leave PENDING. The webhook or "Check status" will
      // find the refund by its notes if Razorpay did make it.
      console.error(`[refunds] ${refund.id}: Razorpay outcome unknown, left pending`, error);
    }
  }
  return prisma.refund.findUniqueOrThrow({ where: { id: refund.id } });
}

/**
 * Record what Razorpay says about one of our refunds. Safe to repeat: only a
 * PENDING refund changes, so the webhook and "Check status" can both call it.
 */
export async function applyRazorpayRefund(refundId: string, remote: RazorpayRefund): Promise<void> {
  if (remote.status === 'failed') {
    await failRefund(refundId, 'Razorpay could not complete the refund.', remote.id);
    return;
  }

  await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({ where: { id: refundId } });
    if (!refund || refund.status !== RefundStatus.PENDING) return;

    if (remote.status === 'pending') {
      if (!refund.razorpayRefundId) {
        await tx.refund.update({ where: { id: refundId }, data: { razorpayRefundId: remote.id } });
      }
      return;
    }

    await tx.refund.update({
      where: { id: refundId },
      data: { razorpayRefundId: remote.id, status: RefundStatus.PROCESSED, processedAt: new Date() },
    });
    const order = await tx.order.findUniqueOrThrow({ where: { id: refund.orderId }, select: { status: true } });
    await tx.orderEvent.create({
      data: {
        orderId: refund.orderId,
        status: order.status,
        note: `Refund of ${formatPrice(refund.amountPaise)} completed by Razorpay (${remote.id}).`,
        createdBy: SYSTEM_ACTOR,
      },
    });
    await settleOrderIfFullyRefundedInTx(tx, refund.orderId);
  }, MULTI_STEP_TRANSACTION);
}

/** Mark a PENDING refund FAILED and flag the order for Sarita. */
async function failRefund(refundId: string, reason: string, razorpayRefundId?: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({ where: { id: refundId } });
    if (!refund || refund.status !== RefundStatus.PENDING) return;

    await tx.refund.update({
      where: { id: refundId },
      data: { status: RefundStatus.FAILED, failureReason: reason, razorpayRefundId: razorpayRefundId ?? undefined },
    });
    const order = await tx.order.findUniqueOrThrow({
      where: { id: refund.orderId },
      select: { status: true, deliveredAt: true },
    });
    // A failed full refund puts a dispatched order back where it was.
    const status =
      order.status === OrderStatus.REFUND_INITIATED
        ? order.deliveredAt
          ? OrderStatus.DELIVERED
          : OrderStatus.SHIPPED
        : order.status;
    const note =
      `Refund of ${formatPrice(refund.amountPaise)} failed (${reason}). Nothing was refunded. ` +
      'Razorpay pays refunds from your Razorpay balance, so a refund larger than the balance is refused — ' +
      'try again after the next payments arrive, or refund by UPI instead. ' +
      'Any returned items recorded with it are already back in stock.';
    await tx.order.update({ where: { id: refund.orderId }, data: { status, attentionReason: note } });
    await tx.orderEvent.create({
      data: { orderId: refund.orderId, status, note, createdBy: SYSTEM_ACTOR },
    });
  }, MULTI_STEP_TRANSACTION);
}

/** Once processed refunds cover the whole payment, mark the order refunded. */
async function settleOrderIfFullyRefundedInTx(tx: DbTransaction, orderId: string): Promise<void> {
  const order = await tx.order.findUniqueOrThrow({
    where: { id: orderId },
    select: { totalPaise: true, status: true },
  });
  const processed = await tx.refund.aggregate({
    where: { orderId, status: RefundStatus.PROCESSED },
    _sum: { amountPaise: true },
  });
  if ((processed._sum.amountPaise ?? 0) < order.totalPaise) return;

  await tx.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: PaymentStatus.REFUNDED,
      refundedAt: new Date(),
      status: order.status === OrderStatus.REFUND_INITIATED ? OrderStatus.REFUNDED : order.status,
    },
  });
}

/**
 * "Check status" — ask Razorpay about a PENDING refund. Finds it by our id in
 * the notes even when the original response was lost; one that never reached
 * Razorpay is marked FAILED, so Sarita can safely issue it again.
 */
export async function syncRefund(refundId: string): Promise<Refund> {
  const refund = await prisma.refund.findUnique({
    where: { id: refundId },
    include: { order: { select: { razorpayPaymentId: true } } },
  });
  if (!refund) throw new NotFoundError('That refund does not exist.');
  if (refund.status !== RefundStatus.PENDING || !refund.order.razorpayPaymentId) return refund;

  const remote = (await listPaymentRefunds(refund.order.razorpayPaymentId)).find(
    (candidate) => candidate.id === refund.razorpayRefundId || refundIdFromNotes(candidate) === refund.id,
  );
  if (remote) {
    await applyRazorpayRefund(refund.id, remote);
  } else if (Date.now() - refund.createdAt.getTime() > LOST_REQUEST_AFTER_MS) {
    await failRefund(refund.id, 'The request never reached Razorpay.');
  }
  return prisma.refund.findUniqueOrThrow({ where: { id: refundId } });
}

/**
 * A refund event from the webhook. Matched by Razorpay id, or by our id in
 * the notes; refunds made directly in the Razorpay dashboard have neither and
 * are ignored here (they are visible there).
 */
export async function applyRefundWebhook(remote: RazorpayRefund): Promise<void> {
  const ourId = refundIdFromNotes(remote);
  const refund = await prisma.refund.findFirst({
    where: { OR: [{ razorpayRefundId: remote.id }, ...(ourId ? [{ id: ourId }] : [])] },
    select: { id: true },
  });
  if (!refund) {
    console.info(`[refunds] webhook for ${remote.id} matches no refund of ours — ignored`);
    return;
  }
  await applyRazorpayRefund(refund.id, remote);
}
