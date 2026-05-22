/**
 * /api/admin/products/[id] — read and update a single product.
 */
import type { NextRequest } from 'next/server';

import { adminProductUpdateSchema } from '@dronagiri/validators';

import { getProductForAdmin, updateProduct } from '@/lib/admin/admin-product-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    await requireAdmin();
    return jsonData({ product: await getProductForAdmin(params.id) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<Response> {
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
