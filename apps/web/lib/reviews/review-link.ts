/**
 * Review invitation links — `/review/<orderId>.<signature>`.
 *
 * Signed with the shared order-link scheme (lib/orders/order-link.ts): only
 * the system can mint one, and the same order always gets the same link.
 * Holding the link is the proof of purchase.
 */
import { orderIdFromSignedToken, signedOrderToken } from '@/lib/orders/order-link';
import { SITE_URL } from '@/lib/seo/site';

export function reviewToken(orderId: string): string {
  return signedOrderToken('review', orderId);
}

export function reviewPath(orderId: string): string {
  return `/review/${reviewToken(orderId)}`;
}

/** The full link to send the customer — always the live site. */
export function reviewUrl(orderId: string): string {
  return `${SITE_URL}${reviewPath(orderId)}`;
}

/** The order id a token was minted for, or null if it is malformed or forged. */
export function orderIdFromReviewToken(token: string): string | null {
  return orderIdFromSignedToken('review', token);
}
