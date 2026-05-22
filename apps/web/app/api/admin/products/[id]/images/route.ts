/**
 * POST /api/admin/products/[id]/images — confirm a finished image upload.
 *
 * Called after the browser has uploaded the bytes to R2. The image service
 * HEAD-checks the object before writing the ProductImage row.
 */
import type { NextRequest } from 'next/server';

import { productImageConfirmSchema } from '@dronagiri/validators';

import { confirmProductImage } from '@/lib/admin/admin-image-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    await requireAdmin();
    const body: unknown = await req.json().catch(() => null);
    const parsed = productImageConfirmSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid image.');
    }
    const image = await confirmProductImage(params.id, parsed.data);
    return jsonData({ image }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
