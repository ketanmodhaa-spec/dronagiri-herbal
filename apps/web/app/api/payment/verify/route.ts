/**
 * POST /api/payment/verify — the browser reports a completed Razorpay payment.
 *
 * Body: `{ razorpayOrderId, razorpayPaymentId, razorpaySignature }`, exactly
 * as the checkout widget's success handler hands them over. The signature is
 * checked first (a forgery costs us no Razorpay call); then the payment is
 * settled, which re-reads it from Razorpay and checks order, amount and
 * currency before confirming anything.
 *
 * The webhook settles the same payment independently, so a customer who
 * closes the tab before this request lands still gets their order confirmed.
 */
import type { NextRequest } from 'next/server';

import { paymentVerifyRequestSchema } from '@dronagiri/validators';

import { requireGuestSession } from '@/lib/auth/require-guest-session';
import { serverConfig } from '@/lib/config.server';
import { RateLimitError, ValidationError } from '@/lib/errors';
import { clientIp, errorResponse, jsonData } from '@/lib/http';
import { PaymentError } from '@/lib/payments/payment-error';
import { settleOnlinePayment } from '@/lib/payments/payment-service';
import { verifyCheckoutSignature } from '@/lib/payments/razorpay-signature';
import { getPaymentVerifyLimiter } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const sessionId = requireGuestSession();
    const { success } = await getPaymentVerifyLimiter().limit(
      `${sessionId}:${clientIp(req) ?? 'unknown'}`,
    );
    if (!success) {
      throw new RateLimitError();
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = paymentVerifyRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid payment details.');
    }
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = parsed.data;

    const genuine = verifyCheckoutSignature({
      razorpayOrderId,
      razorpayPaymentId,
      signature: razorpaySignature,
      keySecret: serverConfig.razorpay.keySecret,
    });
    if (!genuine) {
      throw new PaymentError('We could not verify this payment.', 'INVALID_SIGNATURE');
    }

    const result = await settleOnlinePayment({
      razorpayPaymentId,
      expectedRazorpayOrderId: razorpayOrderId,
      trigger: 'CHECKOUT',
    });
    return jsonData(result, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
