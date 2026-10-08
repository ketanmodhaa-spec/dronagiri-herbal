/**
 * POST /api/cart/items — add units of a product to the cart.
 *
 * Body: `{ productId, quantity }` — never a price. The quantity is added to
 * any existing line and clamped to min(5, stock); a clamp comes back as a
 * `notice` for the toast.
 */
import type { NextRequest } from 'next/server';

import { cartItemSchema } from '@dronagiri/validators';

import { requireGuestSession } from '@/lib/auth/require-guest-session';
import { assertCartEnabled, cartJson, enforceCartRateLimit } from '@/lib/cart/cart-http';
import { addItem } from '@/lib/cart/cart-service';
import { ValidationError } from '@/lib/errors';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    assertCartEnabled();
    const sessionId = requireGuestSession();
    await enforceCartRateLimit(req, sessionId);

    const body: unknown = await req.json().catch(() => null);
    const parsed = cartItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid cart request.');
    }
    return cartJson(await addItem(sessionId, parsed.data));
  } catch (error) {
    return errorResponse(error);
  }
}
