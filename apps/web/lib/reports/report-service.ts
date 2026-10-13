/**
 * Sales report — every figure for one period, computed once and rendered
 * three ways (the admin page, the Excel workbook, the PDF).
 *
 * How things are counted, so the numbers mean the same thing everywhere:
 *   • Orders placed — by the date placed. Unpaid online orders are not
 *     orders yet and are left out; free replacements are counted separately.
 *   • Money received — by the date the money arrived (online: payment
 *     captured; cash: collected on delivery).
 *   • Refunds — by the date the money left (processed). Refunds still being
 *     processed are shown separately and not subtracted.
 *   • Net received = money received − refunds processed.
 *   • Units — from the stock ledger, so cancellations, returns and
 *     replacements are exactly what happened on the shelf.
 * All money is integer paise.
 */
import {
  PaymentMethod,
  PaymentStatus,
  prisma,
  RefundStatus,
  StockMovementReason,
  type OrderStatus,
  type RefundMethod,
} from '@dronagiri/db';

import { SYSTEM_ACTOR } from '@/lib/orders/order-labels';
import { daysIn, istDateKey, type ReportPeriod } from '@/lib/reports/report-period';

export interface ReportSummary {
  ordersPlaced: number;
  orderValuePaise: number;
  averageOrderPaise: number;
  cancelledOrders: number;
  cancelledValuePaise: number;
  netSalesPaise: number;
  paymentsCount: number;
  receivedPaise: number;
  receivedOnlinePaise: number;
  receivedCashPaise: number;
  refundsCount: number;
  refundedPaise: number;
  pendingRefundsCount: number;
  pendingRefundsPaise: number;
  netReceivedPaise: number;
  unitsSold: number;
  replacementOrders: number;
  replacementUnits: number;
}

export interface ReportDay {
  date: string;
  ordersPlaced: number;
  orderValuePaise: number;
  receivedPaise: number;
  refundedPaise: number;
  netReceivedPaise: number;
}

export interface ReportOrderRow {
  orderNumber: string;
  placedAt: Date;
  customer: string;
  city: string;
  state: string;
  units: number;
  totalPaise: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
}

export interface ReportPaymentRow {
  paidAt: Date;
  orderNumber: string;
  amountPaise: number;
  paymentMethod: PaymentMethod;
  reference: string | null;
}

export interface ReportRefundRow {
  requestedAt: Date;
  processedAt: Date | null;
  orderNumber: string;
  amountPaise: number;
  method: RefundMethod;
  status: RefundStatus;
  reason: string;
  reference: string | null;
  issuedBy: string;
}

export interface ReportProductRow {
  name: string;
  sku: string;
  sold: number;
  cancelled: number;
  returned: number;
  replaced: number;
  /** Sold − cancelled − returned. */
  netUnits: number;
  /** Line totals of orders placed in the period and not cancelled. */
  revenuePaise: number;
}

export interface SalesReport {
  period: ReportPeriod;
  generatedAt: Date;
  summary: ReportSummary;
  days: ReportDay[];
  orders: ReportOrderRow[];
  payments: ReportPaymentRow[];
  refunds: ReportRefundRow[];
  products: ReportProductRow[];
}

const sum = (values: number[]): number => values.reduce((total, value) => total + value, 0);

export async function buildSalesReport(period: ReportPeriod): Promise<SalesReport> {
  const inPeriod = { gte: period.from, lt: period.to };

  const [placed, paid, refunds, replacements, movements] = await Promise.all([
    // Real orders placed in the period: cash orders, and online orders once paid.
    prisma.order.findMany({
      where: {
        createdAt: inPeriod,
        replacementForId: null,
        OR: [{ paymentMethod: PaymentMethod.COD }, { paidAt: { not: null } }],
      },
      orderBy: { createdAt: 'asc' },
      select: {
        orderNumber: true,
        createdAt: true,
        shipRecipientName: true,
        shipCity: true,
        shipState: true,
        totalPaise: true,
        paymentMethod: true,
        paymentStatus: true,
        status: true,
        items: { select: { productId: true, quantity: true, lineTotalPaise: true } },
      },
    }),
    // Money that arrived in the period.
    prisma.order.findMany({
      where: {
        paidAt: inPeriod,
        replacementForId: null,
        paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] },
      },
      orderBy: { paidAt: 'asc' },
      select: { orderNumber: true, paidAt: true, totalPaise: true, paymentMethod: true, razorpayPaymentId: true },
    }),
    // Refunds asked for, or completed, in the period.
    prisma.refund.findMany({
      where: { OR: [{ createdAt: inPeriod }, { processedAt: inPeriod }] },
      orderBy: { createdAt: 'asc' },
      include: { order: { select: { orderNumber: true } } },
    }),
    prisma.order.findMany({
      where: { createdAt: inPeriod, replacementForId: { not: null } },
      select: { items: { select: { quantity: true } } },
    }),
    prisma.stockMovement.groupBy({
      by: ['productId', 'reason'],
      where: {
        createdAt: inPeriod,
        orderId: { not: null },
        reason: {
          in: [
            StockMovementReason.SALE,
            StockMovementReason.CANCELLATION,
            StockMovementReason.RETURN,
            StockMovementReason.REPLACEMENT,
          ],
        },
      },
      _sum: { delta: true },
    }),
  ]);

  const processedInPeriod = refunds.filter(
    (refund) =>
      refund.status === RefundStatus.PROCESSED &&
      refund.processedAt !== null &&
      refund.processedAt >= period.from &&
      refund.processedAt < period.to,
  );
  const pendingFromPeriod = refunds.filter(
    (refund) => refund.status === RefundStatus.PENDING && refund.createdAt >= period.from,
  );

  /* Products — ledger units plus revenue from non-cancelled orders. */
  const productIds = new Set<string>(movements.map((row) => row.productId));
  const revenueByProduct = new Map<string, number>();
  for (const order of placed) {
    if (order.status === 'CANCELLED') continue;
    for (const item of order.items) {
      productIds.add(item.productId);
      revenueByProduct.set(item.productId, (revenueByProduct.get(item.productId) ?? 0) + item.lineTotalPaise);
    }
  }
  const productRecords = await prisma.product.findMany({
    where: { id: { in: [...productIds] } },
    select: { id: true, name: true, sku: true },
  });
  const unitsOf = (productId: string, reason: StockMovementReason): number =>
    Math.abs(
      movements.find((row) => row.productId === productId && row.reason === reason)?._sum.delta ?? 0,
    );
  const products: ReportProductRow[] = productRecords
    .map((product) => {
      const sold = unitsOf(product.id, StockMovementReason.SALE);
      const cancelled = unitsOf(product.id, StockMovementReason.CANCELLATION);
      const returned = unitsOf(product.id, StockMovementReason.RETURN);
      return {
        name: product.name,
        sku: product.sku,
        sold,
        cancelled,
        returned,
        replaced: unitsOf(product.id, StockMovementReason.REPLACEMENT),
        netUnits: sold - cancelled - returned,
        revenuePaise: revenueByProduct.get(product.id) ?? 0,
      };
    })
    .sort((a, b) => b.revenuePaise - a.revenuePaise || b.netUnits - a.netUnits);

  /* Admin names for "issued by". */
  const adminIds = [...new Set(refunds.map((refund) => refund.createdBy))].filter((id) => id !== SYSTEM_ACTOR);
  const admins = await prisma.adminUser.findMany({ where: { id: { in: adminIds } }, select: { id: true, name: true } });
  const adminName = new Map(admins.map((admin) => [admin.id, admin.name]));

  /* Day by day. */
  const days = new Map<string, ReportDay>(
    daysIn(period).map((date) => [
      date,
      { date, ordersPlaced: 0, orderValuePaise: 0, receivedPaise: 0, refundedPaise: 0, netReceivedPaise: 0 },
    ]),
  );
  for (const order of placed) {
    const day = days.get(istDateKey(order.createdAt));
    if (day) {
      day.ordersPlaced += 1;
      day.orderValuePaise += order.totalPaise;
    }
  }
  for (const payment of paid) {
    const day = payment.paidAt ? days.get(istDateKey(payment.paidAt)) : undefined;
    if (day) day.receivedPaise += payment.totalPaise;
  }
  for (const refund of processedInPeriod) {
    const day = refund.processedAt ? days.get(istDateKey(refund.processedAt)) : undefined;
    if (day) day.refundedPaise += refund.amountPaise;
  }
  for (const day of days.values()) {
    day.netReceivedPaise = day.receivedPaise - day.refundedPaise;
  }

  /* Summary. */
  const orderValuePaise = sum(placed.map((order) => order.totalPaise));
  const cancelled = placed.filter((order) => order.status === 'CANCELLED');
  const cancelledValuePaise = sum(cancelled.map((order) => order.totalPaise));
  const receivedOnlinePaise = sum(
    paid.filter((order) => order.paymentMethod === PaymentMethod.ONLINE).map((order) => order.totalPaise),
  );
  const receivedCashPaise = sum(
    paid.filter((order) => order.paymentMethod === PaymentMethod.COD).map((order) => order.totalPaise),
  );
  const refundedPaise = sum(processedInPeriod.map((refund) => refund.amountPaise));

  const summary: ReportSummary = {
    ordersPlaced: placed.length,
    orderValuePaise,
    averageOrderPaise: placed.length > 0 ? Math.round(orderValuePaise / placed.length) : 0,
    cancelledOrders: cancelled.length,
    cancelledValuePaise,
    netSalesPaise: orderValuePaise - cancelledValuePaise,
    paymentsCount: paid.length,
    receivedPaise: receivedOnlinePaise + receivedCashPaise,
    receivedOnlinePaise,
    receivedCashPaise,
    refundsCount: processedInPeriod.length,
    refundedPaise,
    pendingRefundsCount: pendingFromPeriod.length,
    pendingRefundsPaise: sum(pendingFromPeriod.map((refund) => refund.amountPaise)),
    netReceivedPaise: receivedOnlinePaise + receivedCashPaise - refundedPaise,
    unitsSold: sum(products.map((product) => product.netUnits)),
    replacementOrders: replacements.length,
    replacementUnits: sum(replacements.flatMap((order) => order.items.map((item) => item.quantity))),
  };

  return {
    period,
    generatedAt: new Date(),
    summary,
    days: [...days.values()],
    orders: placed.map((order) => ({
      orderNumber: order.orderNumber,
      placedAt: order.createdAt,
      customer: order.shipRecipientName,
      city: order.shipCity,
      state: order.shipState,
      units: sum(order.items.map((item) => item.quantity)),
      totalPaise: order.totalPaise,
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      status: order.status,
    })),
    payments: paid.flatMap((order) =>
      order.paidAt
        ? [
            {
              paidAt: order.paidAt,
              orderNumber: order.orderNumber,
              amountPaise: order.totalPaise,
              paymentMethod: order.paymentMethod,
              reference: order.razorpayPaymentId,
            },
          ]
        : [],
    ),
    refunds: refunds.map((refund) => ({
      requestedAt: refund.createdAt,
      processedAt: refund.processedAt,
      orderNumber: refund.order.orderNumber,
      amountPaise: refund.amountPaise,
      method: refund.method,
      status: refund.status,
      reason: refund.reason,
      reference: refund.razorpayRefundId ?? refund.manualReference,
      issuedBy: refund.createdBy === SYSTEM_ACTOR ? 'Automatic' : (adminName.get(refund.createdBy) ?? 'Admin'),
    })),
    products,
  };
}
