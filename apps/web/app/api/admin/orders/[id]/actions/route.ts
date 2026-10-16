/**
 * POST /api/admin/orders/[id]/actions — one status step on an order:
 * PACK, SHIP (courier + tracking), DELIVER, CONFIRM_HELD (a paid order that
 * was waiting for stock), RESOLVE (clear the attention flag with a note), or
 * SAMPLE (record the surprise sample put in the parcel).
 */
import type { NextRequest } from 'next/server';

import { cuidSchema, orderActionSchema } from '@dronagiri/validators';

import { requireAdmin } from '@/lib/auth/require-admin';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import {
  confirmHeldOrder,
  markDelivered,
  markPacked,
  markShipped,
  recordSample,
  resolveAttention,
} from '@/lib/orders/admin-order-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    const admin = await requireAdmin();
    if (!cuidSchema.safeParse(params.id).success) {
      throw new NotFoundError('That order does not exist.');
    }
    const body: unknown = await req.json().catch(() => null);
    const parsed = orderActionSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Invalid order action.');
    }

    const action = parsed.data;
    switch (action.action) {
      case 'PACK':
        await markPacked(params.id, admin.id);
        break;
      case 'SHIP':
        await markShipped(params.id, admin.id, {
          courierName: action.courierName,
          trackingNumber: action.trackingNumber,
        });
        break;
      case 'DELIVER':
        await markDelivered(params.id, admin.id);
        break;
      case 'CONFIRM_HELD':
        await confirmHeldOrder(params.id, admin.id);
        break;
      case 'RESOLVE':
        await resolveAttention(params.id, admin.id, action.note);
        break;
      case 'SAMPLE':
        await recordSample(params.id, admin.id, action.note);
        break;
    }
    return jsonData({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
