/**
 * POST /api/checkout — place an order from the customer's cart.
 *
 * Body: delivery address, optional billing / business GSTIN, consent and an
 * idempotency key (packages/validators/src/checkout.ts) — never items or
 * amounts. Answers with the order number and the pay page to go to.
 * Closed (404) while the cart is switched off.
 */
import type { NextRequest } from 'next/server';

import { checkoutRequestSchema } from '@dronagiri/validators';

import { requireGuestSession } from '@/lib/auth/require-guest-session';
import { assertCartEnabled } from '@/lib/cart/cart-http';
import { placeCheckoutOrder } from '@/lib/checkout/checkout-service';
import { RateLimitError, ValidationError } from '@/lib/errors';
import { clientIp, errorResponse, jsonData } from '@/lib/http';
import { getCheckoutLimiter } from '@/lib/ratelimit';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    assertCartEnabled();
    const sessionId = await requireGuestSession();
    const { success } = await getCheckoutLimiter().limit(`${sessionId}:${clientIp(req) ?? 'unknown'}`);
    if (!success) {
      throw new RateLimitError('Too many attempts. Please wait a minute and try again.');
    }

    const body: unknown = await req.json().catch(() => null);
    const parsed = checkoutRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Please check your details.');
    }

    const result = await placeCheckoutOrder(sessionId, parsed.data);
    return jsonData(result, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return errorResponse(error);
  }
}
