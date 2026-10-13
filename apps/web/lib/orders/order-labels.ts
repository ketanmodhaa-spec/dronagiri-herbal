/**
 * Order vocabulary shared by the admin pages, API routes and services:
 * human labels for every status, the tabs of Sarita's order list, and the
 * actor name for automatic changes. Plain data — safe in client components.
 */
import type { OrderStatus, PaymentStatus, RefundStatus } from '@dronagiri/db';

/** `createdBy` on events and ledger entries the system made on its own. */
export const SYSTEM_ACTOR = 'system';

/** An online order nobody has paid for is cancelled after this long. */
export const UNPAID_ORDER_TTL_HOURS = 24;

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING: 'Awaiting payment',
  CONFIRMED: 'To pack',
  PACKED: 'Packed',
  SHIPPED: 'Shipped',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  REFUND_INITIATED: 'Refund started',
  REFUNDED: 'Refunded',
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: 'Not paid',
  PAID: 'Paid',
  FAILED: 'Payment failed',
  REFUNDED: 'Refunded',
};

export const REFUND_STATUS_LABEL: Record<RefundStatus, string> = {
  PENDING: 'Processing',
  PROCESSED: 'Refunded',
  FAILED: 'Failed',
};

/** The tabs of the order list, in the order Sarita works through them. */
export const ORDER_TABS = [
  { key: 'attention', label: 'Needs attention' },
  { key: 'to-pack', label: 'To pack' },
  { key: 'packed', label: 'Packed' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
  { key: 'unpaid', label: 'Unpaid' },
  { key: 'closed', label: 'Cancelled & refunded' },
] as const;

export type OrderTab = (typeof ORDER_TABS)[number]['key'];

export function isOrderTab(value: string | undefined): value is OrderTab {
  return ORDER_TABS.some((tab) => tab.key === value);
}

/** Reasons offered in the refund form; "Other" asks for a note. */
export const REFUND_REASONS = [
  'Cancelled before dispatch',
  'Damaged or leaking on arrival',
  'Wrong product delivered',
  'Returned unopened',
  'Out of stock after payment',
  'Goodwill',
  'Other',
] as const;
