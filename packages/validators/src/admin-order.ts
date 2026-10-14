/**
 * Admin order requests — status changes, cancellation, refunds and
 * replacements from Sarita's order screens.
 *
 * A refund amount is the one place an amount comes from a client, and only
 * from the authenticated owner: the server still caps it at what the customer
 * actually paid, minus what has already been refunded.
 */
import { z } from 'zod';

import { cuidSchema, MAX_CART_LINES, paisePriceSchema, quantitySchema } from './primitives';

const reasonSchema = z
  .string()
  .trim()
  .min(3, 'Add a short reason')
  .max(300, 'Please keep the reason under 300 characters');

/** One status step. `SHIP` carries the courier and tracking number. */
export const orderActionSchema = z.discriminatedUnion('action', [
  z.strictObject({ action: z.literal('PACK') }),
  z.strictObject({
    action: z.literal('SHIP'),
    courierName: z.string().trim().min(2, 'Enter the courier name').max(60, 'Courier name is too long'),
    trackingNumber: z
      .string()
      .trim()
      .min(4, 'Enter the tracking (AWB) number')
      .max(40, 'Tracking number is too long'),
  }),
  z.strictObject({ action: z.literal('DELIVER') }),
  z.strictObject({ action: z.literal('CONFIRM_HELD') }),
  z.strictObject({ action: z.literal('RESOLVE'), note: reasonSchema }),
  /** The packer put a surprise sample in the parcel — what it was. */
  z.strictObject({
    action: z.literal('SAMPLE'),
    note: z.string().trim().min(2, 'Say which sample went in').max(120, 'Keep it short'),
  }),
]);

export type OrderAction = z.infer<typeof orderActionSchema>;

export const orderCancelSchema = z.strictObject({
  reason: reasonSchema,
  /** Used for the automatic refund of a paid order, so a retried cancel refunds once. */
  idempotencyKey: z.uuid({ error: 'Invalid request key' }),
});

export type OrderCancel = z.infer<typeof orderCancelSchema>;

/** Units of one product — returned to stock, or sent as a replacement. */
const orderLineSchema = z.strictObject({
  productId: cuidSchema,
  quantity: quantitySchema,
});

const orderLinesSchema = z
  .array(orderLineSchema)
  .max(MAX_CART_LINES, 'Too many lines')
  .refine((lines) => new Set(lines.map((line) => line.productId)).size === lines.length, {
    error: 'Each product may appear only once',
  });

export const refundCreateSchema = z.strictObject({
  amountPaise: paisePriceSchema,
  reason: reasonSchema,
  /** Returned, resellable units to put back in stock. Empty when nothing came back. */
  restock: orderLinesSchema,
  /** UPI / bank transfer reference — required by the server for cash orders. */
  manualReference: z.string().trim().min(4, 'Enter the transfer reference').max(60).optional(),
  idempotencyKey: z.uuid({ error: 'Invalid request key' }),
});

export type RefundCreate = z.infer<typeof refundCreateSchema>;

export const replacementCreateSchema = z.strictObject({
  lines: orderLinesSchema.min(1, 'Choose at least one item to replace'),
  reason: reasonSchema,
});

export type ReplacementCreate = z.infer<typeof replacementCreateSchema>;
