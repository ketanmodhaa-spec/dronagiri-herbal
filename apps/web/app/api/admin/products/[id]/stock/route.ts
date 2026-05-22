/**
 * POST /api/admin/products/[id]/stock — adjust a product's stock.
 *
 * The admin sends the new absolute count; the stock service derives the delta
 * under a row lock and records one ADJUSTMENT movement in the ledger.
 */
import type { NextRequest } from 'next/server';

import { StockMovementReason, StockMovementSource } from '@dronagiri/db';
import { stockAdjustmentSchema } from '@dronagiri/validators';

import { requireAdmin } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse, jsonData } from '@/lib/http';
import { setStockLevel } from '@/lib/inventory/stock-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RouteContext {
  params: { id: string };
}

export async function POST(req: NextRequest, { params }: RouteContext): Promise<Response> {
  try {
    const admin = await requireAdmin();
    const body: unknown = await req.json().catch(() => null);
    const parsed = stockAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.issues[0]?.message ?? 'Enter a valid stock count.');
    }
    const stock = await setStockLevel({
      productId: params.id,
      newCount: parsed.data.newCount,
      reason: StockMovementReason.ADJUSTMENT,
      source: StockMovementSource.ADMIN_PANEL,
      createdBy: admin.id,
      note: parsed.data.note ?? null,
    });
    return jsonData({ stock });
  } catch (error) {
    return errorResponse(error);
  }
}
