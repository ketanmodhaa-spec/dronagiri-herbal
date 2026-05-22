/**
 * /api/admin/products — list the catalogue, create a product.
 */
import type { NextRequest } from 'next/server';

import { adminProductCreateSchema } from '@dronagiri/validators';

import { createProduct, listProductsForAdmin } from '@/lib/admin/admin-product-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    return jsonData({ products: await listProductsForAdmin() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const body: unknown = await req.json().catch(() => null);
    const parsed = adminProductCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Enter valid product details.');
    }
    const product = await createProduct(parsed.data, admin.id);
    return jsonData({ product }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
