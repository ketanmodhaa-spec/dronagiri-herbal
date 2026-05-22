/**
 * Admin category schemas — the catalogue's category write path.
 *
 * Used by the admin panel only. The category image is uploaded separately via
 * the R2 pipeline, so `imageUrl` is not part of these schemas.
 */
import { z } from 'zod';

import { SLUG_REGEX } from './product';

const categoryFields = {
  name: z.string().trim().min(1, 'Name is required').max(120),
  nameGu: z.string().trim().max(120).optional(),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug is required')
    .max(120)
    .regex(SLUG_REGEX, 'Slug may use only lowercase letters, numbers and hyphens'),
  description: z.string().trim().max(500).optional(),
  imageUrl: z.string().trim().max(500).optional(),
  sortOrder: z.number().int().min(0).max(100_000).default(0),
  isActive: z.boolean().default(true),
};

export const adminCategoryCreateSchema = z.strictObject(categoryFields);
export const adminCategoryUpdateSchema = z.strictObject(categoryFields);

export type AdminCategoryCreate = z.infer<typeof adminCategoryCreateSchema>;
export type AdminCategoryUpdate = z.infer<typeof adminCategoryUpdateSchema>;
