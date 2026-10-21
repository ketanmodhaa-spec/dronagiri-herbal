/**
 * Order notifications — who hears what when an order moves.
 *
 *   Paid (or released from hold)  customer: order_confirmed
 *   Paid online                   Sarita:   new_order_alert + email to store@
 *   Shipped                       customer: order_shipped
 *   Delivered                     customer: order_delivered
 *   Cancelled after confirmation  customer: order_cancelled
 *   Refund accepted by Razorpay   customer: refund_initiated
 *   Refund completed              customer: refund_completed
 *
 * Callers wrap these in `runAfterResponse`: the order change is already
 * committed, and every send is logged by the WhatsApp / email clients. The
 * texts are the ones approved by Meta (lib/notifications/whatsapp/TEMPLATES.md).
 */
import { OrderStatus, PaymentMethod, prisma } from '@dronagiri/db';

import { serverConfig } from '@/lib/config.server';
import { formatPrice } from '@/lib/format';
import { sendEmail } from '@/lib/notifications/email/client';
import { sendWhatsAppTemplate } from '@/lib/notifications/whatsapp/client';
import {
  newOrderAlertTemplate,
  orderCancelledTemplate,
  orderConfirmedTemplate,
  orderDeliveredTemplate,
  orderShippedTemplate,
  refundCompletedTemplate,
  refundInitiatedTemplate,
} from '@/lib/notifications/whatsapp/templates';
import { SITE_URL } from '@/lib/seo/site';

/** The shipping policy promises dispatch within 2–4 business days; we quote the outer edge. */
const DISPATCH_BUSINESS_DAYS = 4;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const dispatchDateLabel = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'UTC', // the date below is already shifted to IST
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const rupeesNumber = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

/** "348" or "1,248.50" — the templates print their own ₹ sign. */
function rupees(paise: number): string {
  return rupeesNumber.format(paise / 100);
}

/** Dispatch-by date: business days from today in IST, skipping Sundays. */
export function dispatchByLabel(now = new Date()): string {
  let day = new Date(now.getTime() + IST_OFFSET_MS);
  let added = 0;
  while (added < DISPATCH_BUSINESS_DAYS) {
    day = new Date(day.getTime() + DAY_MS);
    if (day.getUTCDay() !== 0) added++;
  }
  return dispatchDateLabel.format(day);
}

/** Shiprocket's public tracking page — every parcel is booked through Shiprocket. */
function courierTrackingUrl(trackingNumber: string): string {
  return `https://shiprocket.co/tracking/${encodeURIComponent(trackingNumber)}`;
}

function firstName(recipientName: string): string {
  return recipientName.trim().split(/\s+/)[0] ?? recipientName;
}

async function loadOrder(orderId: string) {
  return prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      customerId: true,
      customer: { select: { phone: true } },
      shipRecipientName: true,
      shipCity: true,
      shipPincode: true,
      totalPaise: true,
      paymentMethod: true,
      courierName: true,
      trackingNumber: true,
      paidAt: true,
      items: { select: { productName: true, quantity: true }, orderBy: { createdAt: 'asc' } },
    },
  });
}

type LoadedOrder = Awaited<ReturnType<typeof loadOrder>>;

function recipientOf(order: LoadedOrder) {
  return { to: order.customer.phone, orderId: order.id, customerId: order.customerId };
}

async function sendOrderConfirmed(order: LoadedOrder): Promise<void> {
  await sendWhatsAppTemplate({
    ...recipientOf(order),
    template: orderConfirmedTemplate,
    params: {
      customerFirstName: firstName(order.shipRecipientName),
      orderNumber: order.orderNumber,
      expectedDispatch: dispatchByLabel(),
    },
  });
}

/** The customer's "your order is confirmed" message — e.g. once a held order is released. */
export async function notifyOrderConfirmed(orderId: string): Promise<void> {
  await sendOrderConfirmed(await loadOrder(orderId));
}

/** Tell Sarita a paid order is waiting to be packed — WhatsApp, with an email copy. */
async function alertOwnerToPack(order: LoadedOrder): Promise<void> {
  const items = order.items.map((item) => `${item.quantity} × ${item.productName}`).join(', ');
  const shipTo = `${order.shipCity} ${order.shipPincode}`;
  const payment = order.paymentMethod === PaymentMethod.COD ? 'Cash on Delivery' : 'paid online';
  const adminOrderUrl = `${SITE_URL}/admin/orders/${order.id}`;

  await sendWhatsAppTemplate({
    to: serverConfig.owner.whatsappNumber,
    orderId: order.id,
    template: newOrderAlertTemplate,
    params: {
      orderNumber: order.orderNumber,
      totalRupees: rupees(order.totalPaise),
      paymentMethod: payment,
      items,
      city: shipTo,
      adminOrderUrl,
    },
  });
  await sendEmail({
    to: serverConfig.email.ownerInbox,
    templateName: 'new_order_alert',
    orderId: order.id,
    subject: `New order ${order.orderNumber} — ${formatPrice(order.totalPaise)} ${payment}`,
    text: [
      `New order ${order.orderNumber} — ${formatPrice(order.totalPaise)}, ${payment}.`,
      '',
      `Items: ${items}`,
      `Ship to: ${order.shipRecipientName}, ${shipTo}`,
      '',
      `Open the order to pack it: ${adminOrderUrl}`,
    ].join('\n'),
  });
}

/** An online payment just confirmed the order: the customer and Sarita both hear. */
export async function notifyOrderPaid(orderId: string): Promise<void> {
  const order = await loadOrder(orderId);
  await sendOrderConfirmed(order);
  await alertOwnerToPack(order);
}

export async function notifyOrderShipped(orderId: string): Promise<void> {
  const order = await loadOrder(orderId);
  if (!order.courierName || !order.trackingNumber) return;
  await sendWhatsAppTemplate({
    ...recipientOf(order),
    template: orderShippedTemplate,
    params: {
      customerFirstName: firstName(order.shipRecipientName),
      orderNumber: order.orderNumber,
      courier: order.courierName,
      trackingNumber: order.trackingNumber,
      trackingUrl: courierTrackingUrl(order.trackingNumber),
    },
  });
}

export async function notifyOrderDelivered(orderId: string): Promise<void> {
  const order = await loadOrder(orderId);
  await sendWhatsAppTemplate({
    ...recipientOf(order),
    template: orderDeliveredTemplate,
    params: { customerFirstName: firstName(order.shipRecipientName), orderNumber: order.orderNumber },
  });
}

/**
 * Only an order the customer was told about — paid, or confirmed — gets a
 * cancellation message. An unpaid order closing quietly is not news to them.
 */
export async function notifyOrderCancelled(orderId: string, reason: string): Promise<void> {
  const order = await loadOrder(orderId);
  const wasConfirmed =
    order.paidAt !== null ||
    (await prisma.orderEvent.count({ where: { orderId, status: OrderStatus.CONFIRMED } })) > 0;
  if (!wasConfirmed) return;
  await sendWhatsAppTemplate({
    ...recipientOf(order),
    template: orderCancelledTemplate,
    params: { customerFirstName: firstName(order.shipRecipientName), orderNumber: order.orderNumber, reason },
  });
}

async function loadRefund(refundId: string) {
  return prisma.refund.findUniqueOrThrow({
    where: { id: refundId },
    select: { orderId: true, amountPaise: true },
  });
}

export async function notifyRefundInitiated(refundId: string): Promise<void> {
  const refund = await loadRefund(refundId);
  const order = await loadOrder(refund.orderId);
  await sendWhatsAppTemplate({
    ...recipientOf(order),
    template: refundInitiatedTemplate,
    params: {
      customerFirstName: firstName(order.shipRecipientName),
      orderNumber: order.orderNumber,
      amountRupees: rupees(refund.amountPaise),
    },
  });
}

export async function notifyRefundCompleted(refundId: string): Promise<void> {
  const refund = await loadRefund(refundId);
  const order = await loadOrder(refund.orderId);
  await sendWhatsAppTemplate({
    ...recipientOf(order),
    template: refundCompletedTemplate,
    params: {
      customerFirstName: firstName(order.shipRecipientName),
      orderNumber: order.orderNumber,
      amountRupees: rupees(refund.amountPaise),
    },
  });
}
