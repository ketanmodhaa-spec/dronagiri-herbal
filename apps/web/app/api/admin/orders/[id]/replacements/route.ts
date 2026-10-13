/**
 * POST /api/admin/orders/[id]/replacements — send free replacement goods for
 * a damaged or wrong item. Creates a linked ₹0 order in the packing queue.
 */
import type { NextRequest } from 'next/server';

import { cuidSchema, replacementCreateSchema } from '@dronagiri/validators';

import { requireAdmin } from '@/lib/auth/require-admin';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { createReplacement } from '@/lib/orders/replacement-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const admin = await requireAdmin();
    if (!cuidSchema.safeParse(params.id).success) {
      throw new NotFoundError('That order does not exist.');
    }
    const body: unknown = await req.json().catch(() => null);
    const parsed = replacementCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Check the replacement details.');
    }

    const replacement = await createReplacement({ ...parsed.data, orderId: params.id, adminId: admin.id });
    return jsonData({ replacement });
  } catch (error) {
    return errorResponse(error);
  }
}
