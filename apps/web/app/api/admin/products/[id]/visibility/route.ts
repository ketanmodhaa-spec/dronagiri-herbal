/**
 * POST /api/admin/products/[id]/visibility — show or hide a product in the shop.
 */
import type { NextRequest } from 'next/server';

import { productVisibilitySchema } from '@dronagiri/validators';

import { setProductVisibility } from '@/lib/admin/admin-product-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    await requireAdmin();
    const body: unknown = await req.json().catch(() => null);
    const parsed = productVisibilitySchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError('Choose whether the product is shown or hidden.');
    }
    const product = await setProductVisibility(params.id, parsed.data.isActive);
    return jsonData({ isActive: product.isActive });
  } catch (error) {
    return errorResponse(error);
  }
}
