/**
 * Shared plumbing for the `/api/cart*` route handlers — the steps every cart
 * route runs before it reaches the cart service.
 */
import { config } from '@/lib/config';
import { NotFoundError, RateLimitError } from '@/lib/errors';
import { clientIp, jsonData } from '@/lib/http';
import { getCartMutationLimiter } from '@/lib/ratelimit';

/** While the cart flag is off, the cart API does not exist. */
export function assertCartEnabled(): void {
  if (!config.cart.enabled) {
    throw new NotFoundError();
  }
}

/** Bot-protection layer 3: 30 mutations per minute per `sessionId:ip`. */
export async function enforceCartRateLimit(req: Request, sessionId: string): Promise<void> {
  const key = `${sessionId}:${clientIp(req) ?? 'unknown'}`;
  const { success } = await getCartMutationLimiter().limit(key);
  if (!success) {
    throw new RateLimitError('You are updating your cart too quickly. Please wait a moment.');
  }
}

/** Success envelope for cart responses — never cached anywhere. */
export function cartJson<T>(data: T): Response {
  return jsonData(data, { headers: { 'Cache-Control': 'no-store' } });
}
