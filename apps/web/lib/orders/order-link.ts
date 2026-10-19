/**
 * Signed order links — `<orderId>.<signature>`.
 *
 * The signature is an HMAC of the order id under ORDER_TOKEN_SECRET, so only
 * the system can mint a link, nobody can guess one for another order, and the
 * same order always gets the same link (Sarita can resend it any time) without
 * anything being stored. Each purpose signs under its own prefix, so a review
 * link can never be used as a pay link, or the other way round.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { serverConfig } from '@/lib/config.server';

export type OrderLinkPurpose = 'review' | 'pay';

/** Signature length kept in the link — 128 bits of HMAC, base64url. */
const SIGNATURE_CHARS = 22;

function sign(purpose: OrderLinkPurpose, orderId: string): string {
  return createHmac('sha256', serverConfig.orderTokenSecret)
    .update(`${purpose}:${orderId}`)
    .digest('base64url')
    .slice(0, SIGNATURE_CHARS);
}

export function signedOrderToken(purpose: OrderLinkPurpose, orderId: string): string {
  return `${orderId}.${sign(purpose, orderId)}`;
}

/** The order id a token was minted for, or null if it is malformed, forged or for another purpose. */
export function orderIdFromSignedToken(purpose: OrderLinkPurpose, token: string): string | null {
  const match = /^([a-z0-9]{20,32})\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!match) return null;
  const [, orderId, signature] = match;
  const expected = Buffer.from(sign(purpose, orderId));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received) ? orderId : null;
}
