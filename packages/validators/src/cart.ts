/**
 * Cart item — the unit added to the cart and the building block of a checkout.
 *
 * It carries only an identifier and a quantity. The price is deliberately
 * absent: it is always looked up server-side from the product catalogue. A
 * client never tells the server what something costs. `strictObject` rejects
 * any unexpected key — including a smuggled-in `price`.
 */
import { z } from 'zod';

import { cuidSchema, quantitySchema } from './primitives';

export const cartItemSchema = z.strictObject({
  productId: cuidSchema,
  quantity: quantitySchema,
});

export type CartItem = z.infer<typeof cartItemSchema>;
