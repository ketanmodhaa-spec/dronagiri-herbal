/**
 * /api/admin/products/[id]/images/[imageId] — edit or remove a product image.
 *
 * DELETE also removes the underlying R2 object (orphan cleanup).
 */
import type { NextRequest } from 'next/server';

import { productImageUpdateSchema } from '@dronagiri/validators';

import { deleteProductImage, updateProductImage } from '@/lib/admin/admin-image-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string; imageId: string };
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    await requireAdmin();
    const body: unknown = await req.json().catch(() => null);
    const parsed = productImageUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid image update.');
    }
    const image = await updateProductImage(params.id, params.imageId, parsed.data);
    return jsonData({ image });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    await requireAdmin();
    await deleteProductImage(params.id, params.imageId);
    return jsonData({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
