/**
 * Admin product schemas — the catalogue write path.
 *
 * Used by the admin panel only. Money is paise (integer); the long-form
 * bilingual content fields are optional, English required where the schema
 * requires it. Stock is NOT set here — it moves only through the stock
 * endpoint, which writes a ledger entry.
 */
import { z } from 'zod';

import { cuidSchema } from './primitives';

/** Lowercase, hyphen-separated — letters and digits only. */
export const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const slugSchema = z
  .string()
  .trim()
  .min(1, 'Slug is required')
  .max(200)
  .regex(SLUG_REGEX, 'Slug may use only lowercase letters, numbers and hyphens');

/** Optional short line — trimmed, capped. */
const shortText = z.string().trim().max(200).optional();
/** Optional long-form rich text — trimmed, capped. */
const longText = z.string().trim().max(8000).optional();

/** A monetary amount the admin enters — positive integer paise, capped at ₹1,00,000. */
const pricePaiseSchema = z
  .number()
  .int('Price must be a whole number of paise')
  .positive('Price must be greater than zero')
  .max(100_000_00, 'Price cannot exceed ₹1,00,000');

const productFields = {
  name: z.string().trim().min(1, 'Name is required').max(200),
  nameGu: shortText,
  slug: slugSchema,
  sku: z.string().trim().min(1, 'SKU is required').max(64),
  categoryId: cuidSchema,

  tagline: shortText,
  taglineGu: shortText,
  description: z.string().trim().min(1, 'Description is required').max(8000),
  descriptionGu: longText,
  benefits: longText,
  benefitsGu: longText,
  ingredients: longText,
  ingredientsGu: longText,
  howToUse: longText,
  howToUseGu: longText,

  pricePaise: pricePaiseSchema,
  comparePaise: pricePaiseSchema.optional(),
  sizeLabel: shortText,
  weightGrams: z.number().int().positive().max(100_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(100_000).default(10),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
};

/** A compare-at price, when present, must sit above the selling price. */
const compareAbovePrice = (value: { pricePaise: number; comparePaise?: number }) =>
  value.comparePaise === undefined || value.comparePaise > value.pricePaise;
const compareAbovePriceError = {
  error: 'The compare-at price must be higher than the selling price',
  path: ['comparePaise'] as PropertyKey[],
};

/** Create a product. `openingStock` is recorded as the first ledger movement. */
export const adminProductCreateSchema = z
  .strictObject({
    ...productFields,
    openingStock: z.number().int().min(0).max(1_000_000).default(0),
  })
  .refine(compareAbovePrice, compareAbovePriceError);

/** Update a product. The edit form submits the full field set. */
export const adminProductUpdateSchema = z
  .strictObject(productFields)
  .refine(compareAbovePrice, compareAbovePriceError);

/** Adjust stock — the admin enters the new absolute count; the server derives the delta. */
export const stockAdjustmentSchema = z.strictObject({
  newCount: z
    .number()
    .int('Stock must be a whole number')
    .min(0, 'Stock cannot be negative')
    .max(1_000_000),
  note: z.string().trim().max(280).optional(),
});

export type AdminProductCreate = z.infer<typeof adminProductCreateSchema>;
export type AdminProductUpdate = z.infer<typeof adminProductUpdateSchema>;
export type StockAdjustment = z.infer<typeof stockAdjustmentSchema>;
