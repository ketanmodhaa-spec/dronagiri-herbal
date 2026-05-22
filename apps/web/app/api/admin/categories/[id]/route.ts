/**
 * PATCH /api/admin/categories/[id] — update a category.
 */
import type { NextRequest } from 'next/server';

import { adminCategoryUpdateSchema } from '@dronagiri/validators';

import { updateCategory } from '@/lib/admin/admin-category-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function PATCH(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    await requireAdmin();
    const body: unknown = await req.json().catch(() => null);
    const parsed = adminCategoryUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Enter valid category details.');
    }
    const category = await updateCategory(params.id, parsed.data);
    return jsonData({ category });
  } catch (error) {
    return errorResponse(error);
  }
}
