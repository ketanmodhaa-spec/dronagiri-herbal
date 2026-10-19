/**
 * What the customer sees on `/pay/<token>`: the order they are paying for, or
 * why it can no longer be paid. Opening an open order prepares its Razorpay
 * order (reused on every reload) through the same `startOnlinePayment` as any
 * online order — the amount is always the order's server-computed total.
 *
 * Shows only what the payer needs: items, totals, first name and city. The
 * link may be forwarded, so the full address and phone stay off the page.
 */
import { OrderStatus, PaymentStatus, prisma } from '@dronagiri/db';

import { orderIdFromPayToken } from '@/lib/orders/pay-link';
import { PaymentError, PaymentProviderError } from '@/lib/payments/payment-error';
import { startOnlinePayment, type PaymentHandoff } from '@/lib/payments/payment-service';

export interface PayOrderSummary {
  orderNumber: string;
  firstName: string;
  city: string;
  items: { name: string; quantity: number; lineTotalPaise: number }[];
  subtotalPaise: number;
  shippingPaise: number;
  totalPaise: number;
}

export type PayPageState =
  | { kind: 'invalid' }
  | { kind: 'paid'; orderNumber: string }
  | { kind: 'closed'; orderNumber: string }
  /** Razorpay could not be reached just now — the link still works; try again shortly. */
  | { kind: 'unavailable'; orderNumber: string }
  | { kind: 'open'; summary: PayOrderSummary; handoff: PaymentHandoff };

const CLOSED: OrderStatus[] = [OrderStatus.CANCELLED, OrderStatus.REFUND_INITIATED, OrderStatus.REFUNDED];

export async function getPayPage(token: string): Promise<PayPageState> {
  const orderId = orderIdFromPayToken(token);
  if (!orderId) return { kind: 'invalid' };

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      shipRecipientName: true,
      shipCity: true,
      subtotalPaise: true,
      shippingPaise: true,
      totalPaise: true,
      items: { select: { productName: true, quantity: true, lineTotalPaise: true }, orderBy: { createdAt: 'asc' } },
    },
  });
  if (!order) return { kind: 'invalid' };
  if (order.paymentStatus === PaymentStatus.PAID) return { kind: 'paid', orderNumber: order.orderNumber };
  if (CLOSED.includes(order.status)) return { kind: 'closed', orderNumber: order.orderNumber };

  let handoff: PaymentHandoff;
  try {
    handoff = await startOnlinePayment(orderId);
  } catch (error) {
    // Not awaiting online payment any more (e.g. confirmed by another path).
    if (error instanceof PaymentError) return { kind: 'closed', orderNumber: order.orderNumber };
    // Already logged (and so reported to Sentry) by the Razorpay client.
    if (error instanceof PaymentProviderError) return { kind: 'unavailable', orderNumber: order.orderNumber };
    throw error;
  }

  return {
    kind: 'open',
    handoff,
    summary: {
      orderNumber: order.orderNumber,
      firstName: order.shipRecipientName.split(' ')[0] ?? order.shipRecipientName,
      city: order.shipCity,
      items: order.items.map((item) => ({
        name: item.productName,
        quantity: item.quantity,
        lineTotalPaise: item.lineTotalPaise,
      })),
      subtotalPaise: order.subtotalPaise,
      shippingPaise: order.shippingPaise,
      totalPaise: order.totalPaise,
    },
  };
}
