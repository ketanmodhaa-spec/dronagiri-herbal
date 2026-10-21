/**
 * Admin order requests — creating an order for a customer, status changes,
 * cancellation, refunds and replacements from Sarita’s order screens.
 *
 * A refund amount is the one place an amount comes from a client, and only
 * from the authenticated owner: the server still caps it at what the customer
 * actually paid, minus what has already been refunded.
 */
import { z } from 'zod';

import { shippingAddressSchema } from './checkout';
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

/**
 * Most units of one product Sarita can put on an order she creates herself —
 * bulk buyers (over the customer cap of 10) are sent to her, so this is high.
 * Stock is still checked when the order is created.
 */
export const MAX_ADMIN_LINE_QUANTITY = 200;

/**
 * An order Sarita creates for a customer (a WhatsApp or phone enquiry), paid
 * online through a private link. Like checkout, it carries no amount: prices
 * and shipping are computed server-side. The address phone is the customer's
 * identity.
 */
export const adminManualOrderSchema = z.strictObject({
  shippingAddress: shippingAddressSchema,
  items: z
    .array(
      z.strictObject({
        productId: cuidSchema,
        quantity: z
          .number()
          .int('Quantity must be a whole number')
          .min(1, 'Quantity must be at least 1')
          .max(MAX_ADMIN_LINE_QUANTITY, `At most ${MAX_ADMIN_LINE_QUANTITY} of one product`),
      }),
    )
    .min(1, 'Add at least one product')
    .max(MAX_CART_LINES, 'Too many lines')
    .refine((items) => new Set(items.map((item) => item.productId)).size === items.length, {
      error: 'Each product can appear only once — change its quantity instead',
    }),
  /** Owner's discretion — e.g. a family or launch order. */
  waiveShipping: z.boolean(),
  internalNote: z.string().trim().max(500, 'Please keep the note under 500 characters').optional(),
  /** Generated when the form opens; a double tap creates one order, not two. */
  idempotencyKey: z.uuid({ error: 'Invalid idempotency key' }),
});

export type AdminManualOrder = z.infer<typeof adminManualOrderSchema>;
