/**
 * Checkout request — the payload that turns the customer's cart into an order.
 *
 * Who receives it (delivery address), who is billed (optional separate
 * billing address, optional business GSTIN), consent, and an idempotency key.
 * Notably absent: the items and any amount. The server reads the cart from
 * the customer's own session and prices every line from the catalogue, so
 * nothing the browser sends can change what is ordered or charged.
 */
import { z } from 'zod';

import { gstinSchema } from './partner';
import { indianPhoneSchema, indianPincodeSchema } from './primitives';
import { indianStateNameSchema, stateCodeForName } from './states';

const addressLine = (label: string) =>
  z.string().trim().min(4, `Enter the ${label}`).max(120, 'Address line is too long');
const optionalLine = z.string().trim().max(120, 'Address line is too long').optional();

/** Shipping address. Mirrors the immutable `ship*` snapshot on the Order model. */
export const shippingAddressSchema = z.strictObject({
  recipientName: z.string().trim().min(2, "Enter the recipient's name").max(80, 'Name is too long'),
  phone: indianPhoneSchema,
  line1: addressLine('address'),
  line2: optionalLine,
  landmark: z.string().trim().max(120, 'Landmark is too long').optional(),
  city: z.string().trim().min(2, 'Enter the city').max(60, 'City name is too long'),
  state: indianStateNameSchema,
  pincode: indianPincodeSchema,
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

/** Billing address, when it differs from the delivery address (a gift, an office). */
export const billingAddressSchema = z.strictObject({
  name: z.string().trim().min(2, 'Enter the billing name').max(120, 'Name is too long'),
  line1: addressLine('billing address'),
  line2: optionalLine,
  city: z.string().trim().min(2, 'Enter the billing city').max(60, 'City name is too long'),
  state: indianStateNameSchema,
  pincode: indianPincodeSchema,
});

export type BillingAddress = z.infer<typeof billingAddressSchema>;

/** A business buyer, as registered for GST — their GSTIN goes on the tax invoice. */
export const businessBuyerSchema = z.strictObject({
  gstin: gstinSchema,
  businessName: z.string().trim().min(2, 'Enter the business name').max(120, 'Business name is too long'),
});

export type BusinessBuyer = z.infer<typeof businessBuyerSchema>;

/**
 * Who is billed. A business buyer must give the billing address their GSTIN
 * is registered at, in the GSTIN's own state (its first two digits) — that
 * state is the place of supply on their invoice.
 */
export const orderBillingSchema = z
  .strictObject({
    billingAddress: billingAddressSchema.optional(),
    business: businessBuyerSchema.optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.business) return;
    if (!value.billingAddress) {
      ctx.addIssue({
        code: 'custom',
        path: ['billingAddress'],
        message: 'Add the billing address your GSTIN is registered at',
      });
      return;
    }
    if (stateCodeForName(value.billingAddress.state) !== value.business.gstin.slice(0, 2)) {
      ctx.addIssue({
        code: 'custom',
        path: ['billingAddress', 'state'],
        message: 'The billing state must be the state your GSTIN is registered in',
      });
    }
  });

export type OrderBilling = z.infer<typeof orderBillingSchema>;

/**
 * Payment method. Mirrors the `PaymentMethod` enum in the Prisma schema:
 * `ONLINE` covers every Razorpay rail (UPI, card, netbanking) — the customer
 * picks the specific rail inside the Razorpay widget, not in this request.
 */
export const paymentMethodSchema = z.enum(['ONLINE', 'COD'], {
  error: 'Choose a valid payment method',
});

export type PaymentMethod = z.infer<typeof paymentMethodSchema>;

export const checkoutRequestSchema = z.strictObject({
  shippingAddress: shippingAddressSchema,
  billing: orderBillingSchema,
  /** The unticked "send me offers" box. Only `true` records consent. */
  marketingConsent: z.boolean(),
  acceptTerms: z.literal(true, { error: 'Please accept the Terms and the Privacy Policy' }),
  /**
   * Generated when the checkout page opens. The server stores it on the order
   * (`Order.idempotencyKey`, unique), so a retried submit on a slow connection
   * returns the same order instead of creating a second one.
   */
  idempotencyKey: z.uuid({ error: 'Invalid idempotency key' }),
});

export type CheckoutRequest = z.infer<typeof checkoutRequestSchema>;
