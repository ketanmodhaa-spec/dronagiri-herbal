/**
 * POST /api/admin/orders — create an order for a customer, to be paid online
 * through a private link. Answers with the order and its pay link.
 */
import type { NextRequest } from 'next/server';

import { adminManualOrderSchema } from '@dronagiri/validators';

import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { createManualOrder } from '@/lib/orders/manual-order-service';
import { payUrl } from '@/lib/orders/pay-link';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const body: unknown = await req.json().catch(() => null);
    const parsed = adminManualOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Check the order details.');
    }
    const order = await createManualOrder(parsed.data, admin.id);
    return jsonData({ ...order, payUrl: payUrl(order.id) }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
