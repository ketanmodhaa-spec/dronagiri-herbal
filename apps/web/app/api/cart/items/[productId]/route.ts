/**
 * PATCH  /api/cart/items/:productId — set a line's quantity (absolute).
 * DELETE /api/cart/items/:productId — remove a line.
 */
import type { NextRequest } from 'next/server';

import { cartProductIdParamSchema, updateCartItemSchema } from '@dronagiri/validators';

import { requireGuestSession } from '@/lib/auth/require-guest-session';
import { assertCartEnabled, cartJson, enforceCartRateLimit } from '@/lib/cart/cart-http';
import { removeItem, setItemQuantity } from '@/lib/cart/cart-service';
import { ValidationError } from '@/lib/errors';
import { errorResponse } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { productId: string };
}

function parseProductId(params: RouteContext['params']): string {
  const parsed = cartProductIdParamSchema.safeParse(params.productId);
  if (!parsed.success) {
    throw new ValidationError('Invalid product.');
  }
  return parsed.data;
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    assertCartEnabled();
    const sessionId = requireGuestSession();
    await enforceCartRateLimit(req, sessionId);

    const productId = parseProductId(params);
    const body: unknown = await req.json().catch(() => null);
    const parsed = updateCartItemSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid quantity.');
    }
    return cartJson(await setItemQuantity(sessionId, { productId, quantity: parsed.data.quantity }));
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    assertCartEnabled();
    const sessionId = requireGuestSession();
    await enforceCartRateLimit(req, sessionId);
    return cartJson({ cart: await removeItem(sessionId, parseProductId(params)) });
  } catch (error) {
    return errorResponse(error);
  }
}
