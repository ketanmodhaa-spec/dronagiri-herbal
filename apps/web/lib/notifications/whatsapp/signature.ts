/**
 * Meta webhook signature verification.
 *
 * Every POST Meta sends to our webhook carries an `X-Hub-Signature-256`
 * header — `sha256=<hex>` of HMAC-SHA256(appSecret, rawBody). If the body
 * is parsed before verification, even a perfectly-formed signature would
 * fail because the canonical bytes change. The webhook route therefore
 * passes the *raw* request body to this function.
 *
 * The comparison is timing-safe to keep signature forgery out of side
 * channels — every byte of the digest is compared with `timingSafeEqual`.
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Verify a Meta webhook signature.
 *
 * @param rawBody  The exact bytes Meta sent. Re-serialised JSON will not match.
 * @param signatureHeader  The full header value, e.g. `sha256=abc123...`.
 * @param appSecret  The Meta App Secret — kept in `serverConfig.whatsapp`.
 * @returns true when the digest matches; false on every other input.
 */
export function verifyWhatsAppSignature(
  rawBody: string,
  signatureHeader: string | null,
  appSecret: string,
): boolean {
  if (!signatureHeader || !signatureHeader.startsWith('sha256=')) return false;

  const provided = signatureHeader.slice('sha256='.length);
  // A non-hex header could explode the Buffer.from call below — reject early.
  if (!/^[a-f0-9]+$/i.test(provided)) return false;

  const expected = createHmac('sha256', appSecret).update(rawBody).digest('hex');

  // Equal-length comparison is a precondition of timingSafeEqual.
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided, 'hex'), Buffer.from(expected, 'hex'));
}
