/**
 * Image upload schemas — the R2 image pipeline.
 *
 * Uploads go direct to R2 via a presigned URL: the client requests a presign,
 * uploads the bytes, then confirms. These schemas validate the presign request
 * and the confirm / update payloads. The content-type allowlist and the size
 * cap are enforced here and re-checked server-side after the upload lands.
 */
import { z } from 'zod';

import { cuidSchema } from './primitives';

/** The only image content types accepted for upload. */
export const IMAGE_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

/** Maximum upload size — 10 MB. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/** File extension for each accepted content type — used to build the object key. */
export const IMAGE_EXTENSIONS: Record<(typeof IMAGE_CONTENT_TYPES)[number], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Request a presigned upload URL. */
export const imagePresignSchema = z.strictObject({
  scope: z.enum(['product', 'category']),
  targetId: cuidSchema,
  contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(MAX_IMAGE_BYTES, 'The image must be 10 MB or smaller'),
});

/** Confirm a finished product-image upload. */
export const productImageConfirmSchema = z.strictObject({
  objectKey: z.string().trim().min(1).max(300),
  alt: z.string().trim().max(300).optional(),
  altGu: z.string().trim().max(300).optional(),
  width: z.number().int().positive().max(20000).optional(),
  height: z.number().int().positive().max(20000).optional(),
});

/** Edit an existing product image's alt text or position. */
export const productImageUpdateSchema = z.strictObject({
  alt: z.string().trim().max(300).optional(),
  altGu: z.string().trim().max(300).optional(),
  sortOrder: z.number().int().min(0).max(100_000).optional(),
});

export type ImagePresign = z.infer<typeof imagePresignSchema>;
export type ProductImageConfirm = z.infer<typeof productImageConfirmSchema>;
export type ProductImageUpdate = z.infer<typeof productImageUpdateSchema>;
