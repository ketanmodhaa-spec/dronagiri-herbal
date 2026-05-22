/**
 * /api/admin/categories — list categories, create a category.
 */
import type { NextRequest } from 'next/server';

import { adminCategoryCreateSchema } from '@dronagiri/validators';

import { createCategory, listCategoriesForAdmin } from '@/lib/admin/admin-category-service';
import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await requireAdmin();
    return jsonData({ categories: await listCategoriesForAdmin() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    await requireAdmin();
    const body: unknown = await req.json().catch(() => null);
    const parsed = adminCategoryCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Enter valid category details.');
    }
    const category = await createCategory(parsed.data);
    return jsonData({ category }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
