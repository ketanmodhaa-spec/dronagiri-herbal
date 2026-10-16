/**
 * POST /api/admin/orders/[id]/cancel — cancel an order that has not been
 * dispatched. Its stock goes back, and if it was paid online the amount still
 * owed is refunded through Razorpay straight away (the refund policy promises
 * a full refund before dispatch). Owner only, because money moves.
 */
import type { NextRequest } from 'next/server';

import { PaymentMethod } from '@dronagiri/db';
import { cuidSchema, orderCancelSchema } from '@dronagiri/validators';

import { requireOwner } from '@/lib/auth/require-admin';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { cancelOrder } from '@/lib/orders/admin-order-service';
import { issueRefund } from '@/lib/orders/refund-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    const admin = await requireOwner();
    if (!cuidSchema.safeParse(params.id).success) {
      throw new NotFoundError('That order does not exist.');
    }
    const body: unknown = await req.json().catch(() => null);
    const parsed = orderCancelSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Add a reason for cancelling.');
    }

    const { refundDuePaise, paymentMethod } = await cancelOrder(params.id, admin.id, parsed.data.reason);

    // Online payments are refunded automatically. Cash is only collected on
    // delivery, so a cancellable cash order has nothing to give back.
    if (refundDuePaise > 0 && paymentMethod === PaymentMethod.ONLINE) {
      const refund = await issueRefund({
        orderId: params.id,
        amountPaise: refundDuePaise,
        reason: `Cancelled before dispatch — ${parsed.data.reason}`,
        restock: [],
        idempotencyKey: parsed.data.idempotencyKey,
        adminId: admin.id,
      });
      return jsonData({ refund: { amountPaise: refund.amountPaise, status: refund.status } });
    }
    return jsonData({ refund: null });
  } catch (error) {
    return errorResponse(error);
  }
}
