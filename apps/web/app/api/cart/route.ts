/**
 * GET    /api/cart — the current guest cart, priced live from the catalogue.
 * DELETE /api/cart — empty the cart.
 */
import type { NextRequest } from 'next/server';

import { requireGuestSession } from '@/lib/auth/require-guest-session';
import { assertCartEnabled, cartJson, enforceCartRateLimit } from '@/lib/cart/cart-http';
import { clearCart, getCart } from '@/lib/cart/cart-service';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    assertCartEnabled();
    const sessionId = requireGuestSession();
    return cartJson({ cart: await getCart(sessionId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    assertCartEnabled();
    const sessionId = requireGuestSession();
    await enforceCartRateLimit(req, sessionId);
    return cartJson({ cart: await clearCart(sessionId) });
  } catch (error) {
    return errorResponse(error);
  }
}
