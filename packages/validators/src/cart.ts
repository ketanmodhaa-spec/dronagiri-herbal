/**
 * Cart requests — the bodies and path parameters the cart API accepts.
 *
 * Every schema carries only identifiers and quantities. Price is deliberately
 * absent: it is always looked up server-side from the product catalogue. A
 * client never tells the server what something costs. `strictObject` rejects
 * any unexpected key — including a smuggled-in `price`.
 */
import { z } from 'zod';

import { cuidSchema, quantitySchema } from './primitives';

/**
 * A product and a quantity — the body of `POST /api/cart/items` (an add, which
 * increments the line) and the building block of a checkout.
 */
export const cartItemSchema = z.strictObject({
  productId: cuidSchema,
  quantity: quantitySchema,
});

export type CartItem = z.infer<typeof cartItemSchema>;

/**
 * Body of `PATCH /api/cart/items/:productId` — the line's new absolute
 * quantity. Removing a line is a DELETE, never a quantity of zero.
 */
export const updateCartItemSchema = z.strictObject({
  quantity: quantitySchema,
});

export type UpdateCartItem = z.infer<typeof updateCartItemSchema>;

/** The `:productId` path segment on the cart item routes. */
export const cartProductIdParamSchema = cuidSchema;
