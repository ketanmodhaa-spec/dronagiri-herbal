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

/*
 * Sensory profile — the values mirror the Prisma enums of the same names.
 * Display labels live with the web app (lib/products/sensory-labels.ts).
 */
export const PRODUCT_TEXTURES = [
  'LIGHTWEIGHT_GEL',
  'RICH_BODY_BUTTER',
  'NOURISHING_OIL',
  'NON_GREASY_LOTION',
  'REFRESHING_MIST',
  'FOAMING_SHAMPOO',
  'POWDER_PACK',
  'EXFOLIATING_SCRUB',
] as const;
export const PRODUCT_AROMAS = [
  'HERBAL',
  'EARTHY',
  'FLORAL',
  'CITRUS',
  'CAMPHOR',
  'WARM',
  'MILD_NATURAL',
] as const;
export const PRODUCT_SKIN_FINISHES = ['SKIN_MATTE', 'SKIN_DEWY', 'SKIN_NOURISHING', 'SKIN_FRESH'] as const;
export const PRODUCT_HAIR_FINISHES = [
  'HAIR_SOFT_SMOOTH',
  'HAIR_VOLUMINOUS',
  'HAIR_CONDITIONED',
  'HAIR_CLEAN_FRESH',
] as const;
export const PRODUCT_FINISHES = [...PRODUCT_SKIN_FINISHES, ...PRODUCT_HAIR_FINISHES] as const;
export const PRODUCT_ROUTINES = ['LEAVE_ON', 'RINSE_OFF'] as const;

export type ProductTexture = (typeof PRODUCT_TEXTURES)[number];
export type ProductAroma = (typeof PRODUCT_AROMAS)[number];
export type ProductFinish = (typeof PRODUCT_FINISHES)[number];
export type ProductRoutine = (typeof PRODUCT_ROUTINES)[number];

/**
 * GST rates a Dronagiri product can carry, in basis points (500 = 5%). Cosmetics
 * are 18%; shampoo, hair oil and face powders moved to 5% in September 2025.
 * The rate per product is the CA's call — this list only bounds the choice.
 */
export const GST_RATES_BPS = [500, 1800] as const;
export type GstRateBps = (typeof GST_RATES_BPS)[number];

/** HSN code: 4, 6 or 8 digits (4 is the legal minimum for a business our size). */
export const hsnCodeSchema = z
  .string()
  .trim()
  .regex(/^(\d{4}|\d{6}|\d{8})$/, 'HSN code is 4, 6 or 8 digits, e.g. 33059090');

/** One of {@link GST_RATES_BPS}. */
export const gstRateBpsSchema = z.literal(GST_RATES_BPS, { error: 'GST rate must be 5% or 18%' });

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

  texture: z.enum(PRODUCT_TEXTURES).optional(),
  aromas: z
    .array(z.enum(PRODUCT_AROMAS))
    .max(PRODUCT_AROMAS.length)
    .refine((list) => new Set(list).size === list.length, 'Each aroma can be chosen once')
    .default([]),
  finish: z.enum(PRODUCT_FINISHES).optional(),
  routine: z.enum(PRODUCT_ROUTINES).optional(),
  routineNote: z.string().trim().max(80).optional(),
  routineNoteGu: z.string().trim().max(80).optional(),

  pricePaise: pricePaiseSchema,
  comparePaise: pricePaiseSchema.optional(),
  sizeLabel: shortText,
  // Optional until the CA confirms them; an invoice cannot be issued without both.
  hsnCode: hsnCodeSchema.optional(),
  gstRateBps: gstRateBpsSchema.optional(),
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

/** Show or hide a product in the shop — the one-tap control on the edit page. */
export const productVisibilitySchema = z.strictObject({
  isActive: z.boolean(),
});

/** "Is this product already entered?" — the admin form's early check. */
export const productDuplicateQuerySchema = z.strictObject({
  name: z.string().trim().min(1, 'Enter a product name').max(200),
  size: z.string().trim().max(200).optional(),
  excludeId: cuidSchema.optional(),
});

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
export type ProductVisibility = z.infer<typeof productVisibilitySchema>;
