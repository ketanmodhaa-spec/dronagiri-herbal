/**
 * Checkout request — the payload that turns a cart into an order.
 *
 * Three required parts — where it ships, how it is paid for, and what is in
 * it — plus two optional fields: a coupon code and an idempotency key. Notably
 * absent is any monetary amount — subtotal, discount, shipping and total are
 * all computed server-side from catalogue prices, so the client cannot
 * influence what it is charged.
 */
import { z } from 'zod';

import { cartItemSchema } from './cart';
import { couponCodeValueSchema } from './coupon';
import { indianPhoneSchema, indianPincodeSchema, MAX_CART_LINES } from './primitives';

/** Shipping address. Mirrors the immutable `ship*` snapshot on the Order model. */
export const shippingAddressSchema = z.strictObject({
  recipientName: z.string().trim().min(2, "Enter the recipient's name").max(80, 'Name is too long'),
  phone: indianPhoneSchema,
  line1: z.string().trim().min(4, 'Enter the address').max(120, 'Address line is too long'),
  line2: z.string().trim().max(120, 'Address line is too long').optional(),
  landmark: z.string().trim().max(120, 'Landmark is too long').optional(),
  city: z.string().trim().min(2, 'Enter the city').max(60, 'City name is too long'),
  state: z.string().trim().min(2, 'Enter the state').max(60, 'State name is too long'),
  pincode: indianPincodeSchema,
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

/**
 * Payment method. Mirrors the `PaymentMethod` enum in the Prisma schema:
 * `ONLINE` covers every Razorpay rail (UPI, card, netbanking) — the customer
 * picks the specific rail inside the Razorpay widget, not in this request.
 */
export const paymentMethodSchema = z.enum(['ONLINE', 'COD'], {
  error: 'Choose a valid payment method',
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

/** The cart lines being ordered: at least one, each product appearing exactly once. */
export const checkoutItemsSchema = z
  .array(cartItemSchema)
  .min(1, 'Your cart is empty')
  .max(MAX_CART_LINES, 'Too many items in one order')
  .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, {
    error: 'Each product must appear only once — merge duplicate lines',
  });

export const checkoutRequestSchema = z.strictObject({
  shippingAddress: shippingAddressSchema,
  paymentMethod: paymentMethodSchema,
  items: checkoutItemsSchema,

  // Both optional — a checkout succeeds with neither.

  /** Coupon code, if one was applied. Reuses coupon.ts's rules verbatim so the two endpoints never disagree. */
  couponCode: couponCodeValueSchema.optional(),

  /**
   * Idempotency key — a UUID generated on the client before the request is
   * sent. The server persists it on the order (`Order.idempotencyKey`, unique)
   * and rejects a second request carrying the same key, so a retried submit on
   * a slow connection cannot create a duplicate order.
   */
  idempotencyKey: z.uuid({ error: 'Invalid idempotency key' }).optional(),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
