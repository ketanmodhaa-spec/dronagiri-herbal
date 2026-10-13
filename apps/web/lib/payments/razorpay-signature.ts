/**
 * Razorpay signature verification — both kinds, both timing-safe.
 *
 *  • Checkout signature: after a successful payment the widget hands the
 *    browser `razorpay_signature` = HMAC-SHA256(keySecret,
 *    `${razorpay_order_id}|${razorpay_payment_id}`), hex. Only Razorpay and
 *    we hold the key secret, so a valid signature proves the pair is genuine.
 *
 *  • Webhook signature: `X-Razorpay-Signature` = HMAC-SHA256(webhookSecret,
 *    rawBody), hex. It must be computed over the exact bytes received —
 *    re-serialised JSON will not match.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';

const HEX_SHA256 = /^[a-f0-9]{64}$/i;

/** Compare a received hex digest with the expected one without leaking timing. */
function digestMatches(received: string | null | undefined, expectedHex: string): boolean {
  if (!received || !HEX_SHA256.test(received)) return false;
  return timingSafeEqual(Buffer.from(received, 'hex'), Buffer.from(expectedHex, 'hex'));
}

/** Verify the signature the checkout widget returns for a completed payment. */
export function verifyCheckoutSignature(args: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
  keySecret: string;
}): boolean {
  const expected = createHmac('sha256', args.keySecret)
    .update(`${args.razorpayOrderId}|${args.razorpayPaymentId}`)
    .digest('hex');
  return digestMatches(args.signature, expected);
}

/** Verify a webhook body against its `X-Razorpay-Signature` header. */
export function verifyWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  webhookSecret: string,
): boolean {
  const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return digestMatches(signatureHeader, expected);
}
