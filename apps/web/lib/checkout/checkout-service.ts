/**
 * Checkout — the customer's cart becomes an order, then they pay on the
 * order's pay page (the same page Sarita's pay links use).
 *
 * The cart is read on the server from the customer's own session; the
 * request carries only who it goes to and who is billed. If the cart changed
 * since the customer last saw it — an item sold out, stock fell below the
 * quantity, a product was withdrawn — nothing is placed and they are sent
 * back to review it. Online payment only: cash on delivery waits for the
 * WhatsApp OTP check (AGENDA.md, Phase 2).
 */
import type { CheckoutRequest } from '@dronagiri/validators';

import { clearCart, getCart } from '@/lib/cart/cart-service';
import { ValidationError } from '@/lib/errors';
import { OrderStateError } from '@/lib/orders/admin-order-service';
import { SYSTEM_ACTOR } from '@/lib/orders/order-labels';
import { findByIdempotencyKey, placeOnlineOrder } from '@/lib/orders/order-placement';
import { payPath } from '@/lib/orders/pay-link';

export interface CheckoutResult {
  orderNumber: string;
  /** Where the browser goes next to pay — `/pay/<orderId>.<signature>`. */
  payPath: string;
}

export async function placeCheckoutOrder(sessionId: string, request: CheckoutRequest): Promise<CheckoutResult> {
  // A retry of a submit that already succeeded (the response was lost on a
  // slow connection): the cart is empty by now, so answer with that order.
  const placedBefore = await findByIdempotencyKey(request.idempotencyKey);
  if (placedBefore) {
    return { orderNumber: placedBefore.orderNumber, payPath: payPath(placedBefore.id) };
  }

  const cart = await getCart(sessionId);
  if (cart.lines.length === 0) {
    throw new ValidationError('Your cart is empty.', 'CART_EMPTY');
  }
  if (cart.removedProductNames.length > 0 || cart.lines.some((line) => line.status !== 'OK')) {
    throw new OrderStateError(
      'Something in your cart has changed — an item sold out or is low on stock. Please review your cart.',
      'CART_CHANGED',
    );
  }

  const order = await placeOnlineOrder({
    shippingAddress: request.shippingAddress,
    billing: request.billing,
    lines: cart.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
    waiveShipping: false,
    marketingConsent: request.marketingConsent,
    idempotencyKey: request.idempotencyKey,
    createdBy: SYSTEM_ACTOR,
    eventNote: 'Placed online by the customer · awaiting payment',
  });

  // The order holds the lines now; a retry of the same submit finds it by key.
  await clearCart(sessionId);
  return { orderNumber: order.orderNumber, payPath: payPath(order.id) };
}
