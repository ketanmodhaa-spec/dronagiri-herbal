/**
 * POST /api/admin/orders/[id]/refunds/[refundId]/sync — "Check status": ask
 * Razorpay where a processing refund stands.
 */
import { cuidSchema } from '@dronagiri/validators';

import { requireAdmin } from '@/lib/auth/require-admin';
import { NotFoundError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { syncRefund } from '@/lib/orders/refund-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: Promise<{ id: string; refundId: string }>;
}

export async function POST(_req: Request, context: RouteContext): Promise<Response> {
  const params = await context.params;
  try {
    await requireAdmin();
    if (!cuidSchema.safeParse(params.refundId).success) {
      throw new NotFoundError('That refund does not exist.');
    }
    const refund = await syncRefund(params.refundId);
    if (refund.orderId !== params.id) {
      throw new NotFoundError('That refund does not exist.');
    }
    return jsonData({ refund: { id: refund.id, status: refund.status } });
  } catch (error) {
    return errorResponse(error);
  }
}
