/**
 * Payment verification request — what the browser posts after the Razorpay
 * checkout widget reports success. The three values come straight from
 * Razorpay's success handler; the server checks the signature and then asks
 * Razorpay itself what was paid, so none of them is trusted on its own.
 */
import { z } from 'zod';

/** Razorpay order id, e.g. `order_N5mZkV1xYz9AbC`. */
export const razorpayOrderIdSchema = z
  .string()
  .regex(/^order_[A-Za-z0-9]{8,32}$/, 'Invalid payment reference');

/** Razorpay payment id, e.g. `pay_N5mZkV1xYz9AbC`. */
export const razorpayPaymentIdSchema = z
  .string()
  .regex(/^pay_[A-Za-z0-9]{8,32}$/, 'Invalid payment reference');

export const paymentVerifyRequestSchema = z.strictObject({
  razorpayOrderId: razorpayOrderIdSchema,
  razorpayPaymentId: razorpayPaymentIdSchema,
  /** HMAC-SHA256, hex — 64 characters. */
  razorpaySignature: z.string().regex(/^[a-f0-9]{64}$/i, 'Invalid payment signature'),
});

export type PaymentVerifyRequest = z.infer<typeof paymentVerifyRequestSchema>;
