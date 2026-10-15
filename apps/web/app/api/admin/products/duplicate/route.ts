/**
 * /api/admin/products/duplicate — is this product already in the catalogue?
 *
 * The product form asks as soon as the name or size is typed, so staff see
 * "Product already entered" before filling in the rest. Saving re-checks on
 * the server regardless; this endpoint only makes the warning early.
 */
import type { NextRequest } from 'next/server';

import { productDuplicateQuerySchema } from '@dronagiri/validators';

import { findDuplicateProduct } from '@/lib/admin/admin-product-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const parsed = productDuplicateQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Enter a product name.');
    }
    const { name, size, excludeId } = parsed.data;
    return jsonData({ duplicate: await findDuplicateProduct({ name, sizeLabel: size }, excludeId) });
  } catch (error) {
    return errorResponse(error);
  }
}
