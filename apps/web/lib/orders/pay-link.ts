/**
 * Payment links — `/pay/<orderId>.<signature>`, for orders Sarita creates
 * herself. The customer opens it from WhatsApp and pays online; the link is
 * stable, so she can copy and resend it from the order page at any time.
 */
import { orderIdFromSignedToken, signedOrderToken } from '@/lib/orders/order-link';
import { SITE_URL } from '@/lib/seo/site';

export function payPath(orderId: string): string {
  return `/pay/${signedOrderToken('pay', orderId)}`;
}

/** The full link to send the customer — always the live site. */
export function payUrl(orderId: string): string {
  return `${SITE_URL}${payPath(orderId)}`;
}

/** The order id a pay token was minted for, or null if it is malformed or forged. */
export function orderIdFromPayToken(token: string): string | null {
  return orderIdFromSignedToken('pay', token);
}
