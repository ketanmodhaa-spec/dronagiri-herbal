/**
 * /api/admin/products/[id] — read, update and delete a single product.
 */
import type { NextRequest } from 'next/server';

import { adminProductUpdateSchema } from '@dronagiri/validators';

import {
  deleteProduct,
  getProductForAdmin,
  updateProduct,
} from '@/lib/admin/admin-product-service';
import { requireAdmin, requireOwner } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    await requireAdmin();
    return jsonData({ product: await getProductForAdmin(params.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    await requireAdmin();
    const body: unknown = await req.json().catch(() => null);
    const parsed = adminProductUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Enter valid product details.');
    }
    const product = await updateProduct(params.id, parsed.data);
    return jsonData({ product });
  } catch (error) {
    return errorResponse(error);
  }
}

/** Permanent delete — owner only, and only for a product never ordered or reviewed. */
export async function DELETE(_request: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    await requireOwner('Only the owner account can delete products.');
    await deleteProduct(params.id);
    return jsonData({ deleted: true });
  } catch (error) {
    return errorResponse(error);
  }
}
