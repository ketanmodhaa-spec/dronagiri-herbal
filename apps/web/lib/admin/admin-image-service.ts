/**
 * Image administration — the R2 image pipeline for products and categories.
 *
 * Three steps: presign → (the browser uploads to R2) → confirm. The confirm
 * step re-checks the object with a HEAD request before any database row is
 * written, so a mismatched or oversized upload never becomes a catalogue
 * image. Node runtime only.
 */
import { randomUUID } from 'node:crypto';

import { prisma, type ProductImage } from '@dronagiri/db';
import {
  IMAGE_CONTENT_TYPES,
  IMAGE_EXTENSIONS,
  MAX_IMAGE_BYTES,
  type ImagePresign,
  type ProductImageConfirm,
  type ProductImageUpdate,
} from '@dronagiri/validators';

import { NotFoundError, ValidationError } from '@/lib/errors';
import {
  deleteObject,
  headObject,
  objectKeyFromUrl,
  presignUpload,
  publicUrl,
} from '@/lib/storage/r2';

const ALLOWED_CONTENT_TYPES = new Set<string>(IMAGE_CONTENT_TYPES);

/** A presigned upload — the URL the browser PUTs to, plus the key and final URL. */
export interface PresignedUpload {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}

/** Empty optional text becomes a real NULL. */
function orNull(value: string | undefined): string | null {
  return value && value.length > 0 ? value : null;
}

/**
 * Issue a presigned upload URL. The object key is generated here — the client
 * filename is never used — and pinned, together with the content type, into
 * the signed URL.
 */
export async function presignImageUpload(input: ImagePresign): Promise<PresignedUpload> {
  // Confirm the target exists before handing out an upload URL.
  if (input.scope === 'product') {
    const product = await prisma.product.findUnique({
      where: { id: input.targetId },
      select: { id: true },
    });
    if (!product) throw new NotFoundError('Product not found.');
  } else {
    const category = await prisma.category.findUnique({
      where: { id: input.targetId },
      select: { id: true },
    });
    if (!category) throw new NotFoundError('Category not found.');
  }

  const extension = IMAGE_EXTENSIONS[input.contentType];
  const objectKey = `${input.scope}s/${input.targetId}/${randomUUID()}.${extension}`;
  const uploadUrl = await presignUpload(objectKey, input.contentType);
  return { uploadUrl, objectKey, publicUrl: publicUrl(objectKey) };
}

/**
 * Verify a finished upload, then record it as a `ProductImage`.
 *
 * The object is HEAD-checked first — it must exist, sit within the size cap,
 * and carry an allowed content type. Anything else is deleted and rejected, so
 * a bad upload never reaches the catalogue.
 */
export async function confirmProductImage(
  productId: string,
  input: ProductImageConfirm,
): Promise<ProductImage> {
  // The key must belong to this product — it cannot point anywhere else.
  if (!input.objectKey.startsWith(`products/${productId}/`)) {
    throw new ValidationError('That upload does not belong to this product.', 'BAD_OBJECT_KEY');
  }

  // HEAD the object — retry once after a short pause, in case the write is a
  // moment behind, so a valid upload is never rejected and deleted by mistake.
  let head = await headObject(input.objectKey);
  if (!head) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    head = await headObject(input.objectKey);
  }
  if (!head) {
    throw new ValidationError(
      'The upload could not be found. Please try again.',
      'UPLOAD_MISSING',
    );
  }
  if (head.contentLength > MAX_IMAGE_BYTES || !ALLOWED_CONTENT_TYPES.has(head.contentType)) {
    await deleteObject(input.objectKey).catch(() => {});
    throw new ValidationError('That file is not an accepted image.', 'BAD_UPLOAD');
  }

  // New images go to the end of the order.
  const last = await prisma.productImage.aggregate({
    where: { productId },
    _max: { sortOrder: true },
  });

  return prisma.productImage.create({
    data: {
      productId,
      url: publicUrl(input.objectKey),
      alt: orNull(input.alt),
      altGu: orNull(input.altGu),
      width: input.width ?? null,
      height: input.height ?? null,
      sortOrder: (last._max.sortOrder ?? -1) + 1,
    },
  });
}

/** Every image for a product, hero (lowest sortOrder) first. */
export async function listProductImages(productId: string): Promise<ProductImage[]> {
  return prisma.productImage.findMany({
    where: { productId },
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Update an image's alt text or position. */
export async function updateProductImage(
  productId: string,
  imageId: string,
  input: ProductImageUpdate,
): Promise<ProductImage> {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) {
    throw new NotFoundError('Image not found.');
  }
  return prisma.productImage.update({
    where: { id: imageId },
    data: {
      alt: input.alt !== undefined ? orNull(input.alt) : image.alt,
      altGu: input.altGu !== undefined ? orNull(input.altGu) : image.altGu,
      sortOrder: input.sortOrder ?? image.sortOrder,
    },
  });
}

/**
 * Delete a product image — the database row first, then the R2 object. A
 * failed R2 delete is logged, not fatal: a stray object is only wasted
 * storage (the orphan-cleanup sweep in DISPUTE.md will reclaim it).
 */
export async function deleteProductImage(productId: string, imageId: string): Promise<void> {
  const image = await prisma.productImage.findUnique({ where: { id: imageId } });
  if (!image || image.productId !== productId) {
    throw new NotFoundError('Image not found.');
  }
  await prisma.productImage.delete({ where: { id: imageId } });

  const objectKey = objectKeyFromUrl(image.url);
  if (objectKey) {
    await deleteObject(objectKey).catch((error: unknown) => {
      console.error('[r2] failed to delete object', objectKey, error);
    });
  }
}
