/**
 * B2B partner enquiry — the "become a distributor / dealer" form.
 *
 * A short form on purpose: who you want to be (partner type), how to reach
 * you, and where you are. Everything else is optional context that helps
 * Sarita prioritise the call-back. The enum values mirror the Prisma enums
 * of the same names.
 */
import { z } from 'zod';

import { indianPhoneSchema, indianPincodeSchema } from './primitives';
import { indianStateCodeSchema } from './states';

export const PARTNER_TYPES = ['DISTRIBUTOR', 'STOCKIST', 'RETAILER', 'SALES_AGENT'] as const;
export const PARTNER_BACKGROUNDS = [
  'NEW_TO_BUSINESS',
  'RETAIL_SHOP',
  'FMCG_DISTRIBUTION',
  'AYURVEDA_OR_COSMETICS',
  'SALON_OR_PARLOUR',
  'OTHER',
] as const;
export const PARTNER_INVESTMENTS = ['UNDER_50K', 'FROM_50K_TO_2L', 'FROM_2L_TO_5L', 'ABOVE_5L'] as const;
export const PARTNER_ENQUIRY_STATUSES = [
  'NEW',
  'CONTACTED',
  'IN_DISCUSSION',
  'APPOINTED',
  'NOT_SUITABLE',
] as const;

export type PartnerType = (typeof PARTNER_TYPES)[number];
export type PartnerBackground = (typeof PARTNER_BACKGROUNDS)[number];
export type PartnerInvestment = (typeof PARTNER_INVESTMENTS)[number];
export type PartnerEnquiryStatus = (typeof PARTNER_ENQUIRY_STATUSES)[number];

/** GSTIN shape: state code, PAN, entity number, `Z`, check character. */
export const GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const GSTIN_CHARSET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/** True when the GSTIN's 15th character matches the GST portal's checksum. */
export function hasValidGstinChecksum(gstin: string): boolean {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const product = GSTIN_CHARSET.indexOf(gstin[i]) * (i % 2 === 0 ? 1 : 2);
    sum += Math.floor(product / 36) + (product % 36);
  }
  return GSTIN_CHARSET[(36 - (sum % 36)) % 36] === gstin[14];
}

/** A GSTIN, upper-cased, with its checksum verified — catches typos at the form. */
export const gstinSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(GSTIN_REGEX, 'Enter a valid 15-character GSTIN')
  .refine(hasValidGstinChecksum, { error: 'This GSTIN looks mistyped — please check it' });

/** Treat an empty form field as "not provided". */
function optional<T extends z.ZodType>(schema: T) {
  return z.preprocess((value) => (value === '' ? undefined : value), schema.optional());
}

export const partnerEnquirySchema = z.strictObject({
  partnerType: z.enum(PARTNER_TYPES, { error: 'Choose how you would like to partner with us' }),
  name: z.string().trim().min(2, 'Enter your name').max(80, 'Name is too long'),
  phone: indianPhoneSchema,
  email: optional(z.email({ error: 'Enter a valid email address' }).max(120)),
  businessName: optional(z.string().trim().max(120, 'Business name is too long')),
  city: z.string().trim().min(2, 'Enter your city or town').max(60, 'City name is too long'),
  stateCode: indianStateCodeSchema,
  pincode: optional(indianPincodeSchema),
  gstin: optional(gstinSchema),
  background: optional(z.enum(PARTNER_BACKGROUNDS, { error: 'Choose your current business' })),
  investment: optional(z.enum(PARTNER_INVESTMENTS, { error: 'Choose an investment range' })),
  message: optional(z.string().trim().max(1000, 'Please keep the message under 1000 characters')),
  consent: z.literal(true, { error: 'Please agree to be contacted about your enquiry' }),
  /** Honeypot — hidden from people, filled in by bots. Must be empty. */
  website: z.string().max(0).optional(),
});

export type PartnerEnquiryInput = z.infer<typeof partnerEnquirySchema>;

/** Admin update — move the lead along and keep private notes. */
export const partnerEnquiryUpdateSchema = z
  .strictObject({
    status: z.enum(PARTNER_ENQUIRY_STATUSES, { error: 'Choose a valid status' }).optional(),
    internalNote: z.string().trim().max(2000, 'Note is too long').nullable().optional(),
  })
  .refine((value) => value.status !== undefined || value.internalNote !== undefined, {
    error: 'Nothing to update',
  });

export type PartnerEnquiryUpdate = z.infer<typeof partnerEnquiryUpdateSchema>;
