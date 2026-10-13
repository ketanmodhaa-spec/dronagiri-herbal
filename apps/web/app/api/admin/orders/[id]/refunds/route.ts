/**
 * POST /api/admin/orders/[id]/refunds — refund part or all of a paid order.
 * Online orders go back through Razorpay; cash orders are recorded with the
 * UPI / bank reference Sarita paid them with. Owner only.
 */
import type { NextRequest } from 'next/server';

import { cuidSchema, refundCreateSchema } from '@dronagiri/validators';

import { requireOwner } from '@/lib/auth/require-admin';
import { NotFoundError, ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { issueRefund } from '@/lib/orders/refund-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const admin = await requireOwner();
    if (!cuidSchema.safeParse(params.id).success) {
      throw new NotFoundError('That order does not exist.');
    }
    const body: unknown = await req.json().catch(() => null);
    const parsed = refundCreateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Check the refund details.');
    }

    const refund = await issueRefund({ ...parsed.data, orderId: params.id, adminId: admin.id });
    return jsonData({ refund: { id: refund.id, status: refund.status, failureReason: refund.failureReason } });
  } catch (error) {
    return errorResponse(error);
  }
}
