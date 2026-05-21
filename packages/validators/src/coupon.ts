/**
 * Coupon code — its field schema and submission payload.
 *
 * The code is trimmed and upper-cased before validation, matching how codes
 * are stored (`Coupon.code` is uppercase, e.g. "WELCOME10"). Whether the
 * coupon exists, is active, is in date and clears the order minimum is decided
 * server-side — this schema only checks that the input is a well-formed code.
 *
 * `couponCodeValueSchema` is exported on its own so the checkout request can
 * carry an optional coupon code validated by the exact same rules — the two
 * endpoints can never disagree on what a valid code looks like.
 */
import { z } from 'zod';

/** A well-formed coupon code: trimmed, upper-cased, 3–20 letters and digits. */
export const couponCodeValueSchema = z
  .string()
  .trim()
  .toUpperCase()
  .min(3, 'Coupon code is too short')
  .max(20, 'Coupon code is too long')
  .regex(/^[A-Z0-9]+$/, 'Coupon code may contain only letters and numbers');

export const couponCodeSchema = z.strictObject({
  code: couponCodeValueSchema,
});

export type CouponCode = z.infer<typeof couponCodeSchema>;
