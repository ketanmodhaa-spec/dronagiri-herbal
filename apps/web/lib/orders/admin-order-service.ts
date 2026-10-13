/**
 * Admin order service — Sarita's order list, order detail, and every status
 * change she makes by hand.
 *
 * Status changes are compare-and-set: each one names the statuses it may
 * start from, and if the order has moved on in the meantime (another tab, the
 * webhook) nothing is written and she is asked to refresh. Every change adds
 * an OrderEvent recording who made it. Node runtime only.
 */
import {
  MULTI_STEP_TRANSACTION,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  prisma,
  Prisma,
  StockMovementReason,
  StockMovementSource,
  type DbTransaction,
} from '@dronagiri/db';

import { AppError, NotFoundError } from '@/lib/errors';
import {
  commitOrderStockInTx,
  describeShortages,
  restockOrderLinesInTx,
  returnableQuantitiesInTx,
} from '@/lib/orders/order-stock';
import {
  ORDER_STATUS_LABEL,
  SYSTEM_ACTOR,
  UNPAID_ORDER_TTL_HOURS,
  type OrderTab,
} from '@/lib/orders/order-labels';

/** 409 — the order is not in a state that allows this action. */
export class OrderStateError extends AppError {
  constructor(message: string, code = 'ORDER_STATE_CONFLICT') {
    super(code, message, 409);
  }
}

/* ─── List ────────────────────────────────────────────────────────────── */

const LIST_LIMIT = 100;

const UNPAID_WHERE: Prisma.OrderWhereInput = {
  status: OrderStatus.PENDING,
  paymentStatus: { in: [PaymentStatus.PENDING, PaymentStatus.FAILED] },
};

function tabWhere(tab: OrderTab): Prisma.OrderWhereInput {
  switch (tab) {
    case 'attention':
      return { attentionReason: { not: null } };
    case 'to-pack':
      return { status: OrderStatus.CONFIRMED, attentionReason: null };
    case 'packed':
      return { status: OrderStatus.PACKED, attentionReason: null };
    case 'shipped':
      return { status: OrderStatus.SHIPPED, attentionReason: null };
    case 'delivered':
      return { status: OrderStatus.DELIVERED, attentionReason: null };
    case 'unpaid':
      return { ...UNPAID_WHERE, attentionReason: null };
    case 'closed':
      return {
        status: { in: [OrderStatus.CANCELLED, OrderStatus.REFUND_INITIATED, OrderStatus.REFUNDED] },
        attentionReason: null,
      };
  }
}

/** The packing queue is first-in, first-out; every other tab is newest first. */
function tabOrder(tab: OrderTab): Prisma.OrderOrderByWithRelationInput {
  return { createdAt: tab === 'to-pack' || tab === 'packed' ? 'asc' : 'desc' };
}

export async function listOrders(tab: OrderTab) {
  return prisma.order.findMany({
    where: tabWhere(tab),
    orderBy: tabOrder(tab),
    take: LIST_LIMIT,
    select: {
      id: true,
      orderNumber: true,
      createdAt: true,
      status: true,
      paymentStatus: true,
      paymentMethod: true,
      totalPaise: true,
      shipRecipientName: true,
      shipCity: true,
      attentionReason: true,
      replacementForId: true,
      _count: { select: { items: true } },
    },
  });
}

/** Badge counts for the dashboard and the tab bar. */
export async function countOrdersForBadges(): Promise<{ attention: number; toPack: number }> {
  const [attention, toPack] = await Promise.all([
    prisma.order.count({ where: tabWhere('attention') }),
    prisma.order.count({ where: tabWhere('to-pack') }),
  ]);
  return { attention, toPack };
}

/* ─── Detail ──────────────────────────────────────────────────────────── */

export async function getOrderDetail(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      customer: { select: { phone: true, name: true, email: true } },
      items: { orderBy: { createdAt: 'asc' } },
      events: { orderBy: { createdAt: 'asc' } },
      refunds: { orderBy: { createdAt: 'asc' } },
      replacements: { select: { id: true, orderNumber: true, status: true }, orderBy: { createdAt: 'asc' } },
      replacementFor: { select: { id: true, orderNumber: true } },
    },
  });
  if (!order) {
    throw new NotFoundError('That order does not exist.');
  }
  const returnable = await prisma.$transaction((tx) => returnableQuantitiesInTx(tx, orderId));

  // Names for the "by" column of the history — events store the admin id.
  const actorIds = [...new Set([...order.events, ...order.refunds].map((row) => row.createdBy))].filter(
    (id): id is string => id !== null && id !== SYSTEM_ACTOR,
  );
  const admins = await prisma.adminUser.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });

  const refundedOrPending = order.refunds
    .filter((refund) => refund.status !== 'FAILED')
    .reduce((sum, refund) => sum + refund.amountPaise, 0);

  return {
    ...order,
    returnable: Object.fromEntries(returnable) as Record<string, number>,
    actorNames: Object.fromEntries(admins.map((admin) => [admin.id, admin.name])) as Record<string, string>,
    /** Paise that can still be refunded — zero unless the order is paid. */
    refundablePaise:
      order.paymentStatus === PaymentStatus.PAID ? Math.max(0, order.totalPaise - refundedOrPending) : 0,
  };
}

export type OrderDetail = Awaited<ReturnType<typeof getOrderDetail>>;

/* ─── Unpaid expiry ───────────────────────────────────────────────────── */

/**
 * Cancel online orders that have waited more than 24 hours for payment. No
 * stock was ever taken for them, so cancelling is just a status change.
 *
 * Run lazily whenever the admin opens the order list (Vercel Hobby has no
 * crons) — move to the daily cron on the Pro plan. If the customer somehow
 * pays afterwards, settlement refuses an authorized payment (Razorpay returns
 * it) or flags a captured one for a refund.
 */
export async function expireStaleUnpaidOrders(now = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - UNPAID_ORDER_TTL_HOURS * 60 * 60 * 1000);
  const stale = await prisma.order.findMany({
    where: { ...UNPAID_WHERE, paymentMethod: PaymentMethod.ONLINE, createdAt: { lt: cutoff } },
    select: { id: true },
    take: LIST_LIMIT,
  });

  let expired = 0;
  for (const { id } of stale) {
    const changed = await prisma.$transaction(async (tx) => {
      const { count } = await tx.order.updateMany({
        where: { id, ...UNPAID_WHERE },
        data: { status: OrderStatus.CANCELLED, cancelledAt: now },
      });
      if (count === 0) return false;
      await tx.orderEvent.create({
        data: {
          orderId: id,
          status: OrderStatus.CANCELLED,
          note: `Not paid within ${UNPAID_ORDER_TTL_HOURS} hours — cancelled automatically.`,
          createdBy: SYSTEM_ACTOR,
        },
      });
      return true;
    });
    if (changed) expired += 1;
  }
  return expired;
}

/* ─── Status changes ──────────────────────────────────────────────────── */

/** Compare-and-set a status change and record it. Throws if the order moved on. */
async function transitionInTx(
  tx: DbTransaction,
  args: {
    orderId: string;
    from: OrderStatus[];
    to: OrderStatus;
    data?: Prisma.OrderUpdateManyMutationInput;
    note: string;
    adminId: string;
  },
): Promise<void> {
  const { count } = await tx.order.updateMany({
    where: { id: args.orderId, status: { in: args.from }, attentionReason: null },
    data: { ...args.data, status: args.to },
  });
  if (count === 0) {
    const current = await tx.order.findUnique({
      where: { id: args.orderId },
      select: { status: true, attentionReason: true },
    });
    if (!current) throw new NotFoundError('That order does not exist.');
    throw new OrderStateError(
      current.attentionReason
        ? 'This order needs your attention first — deal with the red box at the top.'
        : `This order is "${ORDER_STATUS_LABEL[current.status]}", so that step is not available. ` +
            'Refresh the page to see its latest state.',
    );
  }
  await tx.orderEvent.create({
    data: { orderId: args.orderId, status: args.to, note: args.note, createdBy: args.adminId },
  });
}

export async function markPacked(orderId: string, adminId: string): Promise<void> {
  await prisma.$transaction((tx) =>
    transitionInTx(tx, {
      orderId,
      from: [OrderStatus.CONFIRMED],
      to: OrderStatus.PACKED,
      data: { packedAt: new Date() },
      note: 'Packed.',
      adminId,
    }),
  );
}

export async function markShipped(
  orderId: string,
  adminId: string,
  shipment: { courierName: string; trackingNumber: string },
): Promise<void> {
  await prisma.$transaction((tx) =>
    transitionInTx(tx, {
      orderId,
      // Packing is optional as a separate step — she may pack and ship at once.
      from: [OrderStatus.CONFIRMED, OrderStatus.PACKED],
      to: OrderStatus.SHIPPED,
      data: { shippedAt: new Date(), ...shipment },
      note: `Shipped with ${shipment.courierName}, tracking ${shipment.trackingNumber}.`,
      adminId,
    }),
  );
}

export async function markDelivered(orderId: string, adminId: string): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { paymentMethod: true } });
  if (!order) throw new NotFoundError('That order does not exist.');

  await prisma.$transaction((tx) =>
    transitionInTx(tx, {
      orderId,
      from: [OrderStatus.SHIPPED],
      to: OrderStatus.DELIVERED,
      // Cash on delivery is collected at the door — delivery is the payment.
      data:
        order.paymentMethod === PaymentMethod.COD
          ? { deliveredAt: new Date(), paymentStatus: PaymentStatus.PAID, paidAt: new Date() }
          : { deliveredAt: new Date() },
      note: order.paymentMethod === PaymentMethod.COD ? 'Delivered — cash collected.' : 'Delivered.',
      adminId,
    }),
  );
}

/**
 * Confirm an order that was paid while stock was short, once Sarita has
 * restocked. Takes the stock now — all of it, or the order stays on hold.
 */
export async function confirmHeldOrder(orderId: string, adminId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const [order] = await tx.$queryRaw<{ status: OrderStatus; paymentStatus: PaymentStatus }[]>`
      SELECT "status", "paymentStatus" FROM "Order" WHERE "id" = ${orderId} FOR UPDATE
    `;
    if (!order) throw new NotFoundError('That order does not exist.');
    if (order.status !== OrderStatus.PENDING || order.paymentStatus !== PaymentStatus.PAID) {
      throw new OrderStateError('Only a paid order that is waiting for stock can be confirmed here.');
    }

    const shortages = await commitOrderStockInTx(tx, {
      orderId,
      reason: StockMovementReason.SALE,
      source: StockMovementSource.ADMIN_PANEL,
      createdBy: adminId,
    });
    if (shortages.length > 0) {
      throw new OrderStateError(`Still not enough stock: ${describeShortages(shortages)}.`, 'STOCK_SHORT');
    }

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED, attentionReason: null },
    });
    await tx.orderEvent.create({
      data: { orderId, status: OrderStatus.CONFIRMED, note: 'Stock available — confirmed.', createdBy: adminId },
    });
  }, MULTI_STEP_TRANSACTION);
}

/** Clear the attention flag once Sarita has dealt with it outside the system. */
export async function resolveAttention(orderId: string, adminId: string, note: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, select: { status: true, attentionReason: true } });
    if (!order) throw new NotFoundError('That order does not exist.');
    if (order.attentionReason === null) return;
    await tx.order.update({ where: { id: orderId }, data: { attentionReason: null } });
    await tx.orderEvent.create({
      data: { orderId, status: order.status, note: `Resolved: ${note}`, createdBy: adminId },
    });
  }, MULTI_STEP_TRANSACTION);
}

/** Statuses an order can still be cancelled from — anything not yet dispatched. */
const CANCELLABLE: OrderStatus[] = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.PACKED];

export interface CancelResult {
  /** Paise still owed back to the customer — the caller refunds it. */
  refundDuePaise: number;
  paymentMethod: PaymentMethod;
}

/**
 * Cancel an order that has not been dispatched: stock it took goes back, and
 * the amount still owed to the customer is returned so the caller can refund
 * it (the refund policy promises a full refund before dispatch).
 */
export async function cancelOrder(orderId: string, adminId: string, reason: string): Promise<CancelResult> {
  return prisma.$transaction(async (tx) => {
    const [order] = await tx.$queryRaw<
      { status: OrderStatus; paymentStatus: PaymentStatus; paymentMethod: PaymentMethod; totalPaise: number }[]
    >`
      SELECT "status", "paymentStatus", "paymentMethod", "totalPaise"
      FROM "Order" WHERE "id" = ${orderId} FOR UPDATE
    `;
    if (!order) throw new NotFoundError('That order does not exist.');
    if (!CANCELLABLE.includes(order.status)) {
      throw new OrderStateError(
        'This order has already been dispatched or closed. Use a refund or replacement instead.',
      );
    }

    const returnable = await returnableQuantitiesInTx(tx, orderId);
    await restockOrderLinesInTx(tx, {
      orderId,
      lines: [...returnable].map(([productId, quantity]) => ({ productId, quantity })),
      reason: StockMovementReason.CANCELLATION,
      source: StockMovementSource.ADMIN_PANEL,
      createdBy: adminId,
    });

    await tx.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CANCELLED, cancelledAt: new Date(), attentionReason: null },
    });
    await tx.orderEvent.create({
      data: { orderId, status: OrderStatus.CANCELLED, note: `Cancelled: ${reason}`, createdBy: adminId },
    });

    let refundDuePaise = 0;
    if (order.paymentStatus === PaymentStatus.PAID) {
      const refunded = await tx.refund.aggregate({
        where: { orderId, status: { in: ['PENDING', 'PROCESSED'] } },
        _sum: { amountPaise: true },
      });
      refundDuePaise = order.totalPaise - (refunded._sum.amountPaise ?? 0);
    }
    return { refundDuePaise, paymentMethod: order.paymentMethod };
  }, MULTI_STEP_TRANSACTION);
}
