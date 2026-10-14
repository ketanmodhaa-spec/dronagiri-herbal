/**
 * Review invitation links — `/review/<orderId>.<signature>`.
 *
 * The signature is an HMAC of the order id under ORDER_TOKEN_SECRET, so only
 * the system can mint a link, nobody can guess one for another order, and
 * the same order always gets the same link (Sarita can resend it any time)
 * without anything being stored. Holding the link is the proof of purchase.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

import { serverConfig } from '@/lib/config.server';
import { SITE_URL } from '@/lib/seo/site';

/** Signature length kept in the link — 128 bits of HMAC, base64url. */
const SIGNATURE_CHARS = 22;

function sign(orderId: string): string {
  return createHmac('sha256', serverConfig.orderTokenSecret)
    .update(`review:${orderId}`)
    .digest('base64url')
    .slice(0, SIGNATURE_CHARS);
}

export function reviewToken(orderId: string): string {
  return `${orderId}.${sign(orderId)}`;
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
  const match = /^([a-z0-9]{20,32})\.([A-Za-z0-9_-]{22})$/.exec(token);
  if (!match) return null;
  const [, orderId, signature] = match;
  const expected = Buffer.from(sign(orderId));
  const received = Buffer.from(signature);
  return expected.length === received.length && timingSafeEqual(expected, received) ? orderId : null;
}
