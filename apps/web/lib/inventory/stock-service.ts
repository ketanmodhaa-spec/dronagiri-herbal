/**
 * Stock — the inventory ledger.
 *
 * `Product.stockQty` is a materialised balance; the `StockMovement` table is
 * the source of truth. Stock is therefore never written directly — every
 * change passes through this service, which records one ledger entry and
 * updates the balance together, in a single transaction.
 *
 * The product row is locked `FOR UPDATE` inside that transaction, so
 * concurrent adjustments serialise and the balance can never drift away from
 * the sum of the ledger.
 *
 * Shared on purpose: the admin panel calls it now; the WhatsApp RESTOCK
 * command will call the very same functions later. Node runtime only.
 */
import { prisma, type StockMovementReason, type StockMovementSource } from '@dronagiri/db';

import { AppError } from '@/lib/errors';

/** 400 — a stock change that cannot be applied (would go negative, bad input). */
export class StockError extends AppError {
  constructor(message: string, code = 'STOCK_ERROR') {
    super(code, message, 400);
  }
}

/** The outcome of a stock change. */
export interface StockResult {
  productId: string;
  previousQty: number;
  delta: number;
  newQty: number;
}

/** Where a stock change came from — recorded on the ledger entry. */
interface MovementMeta {
  reason: StockMovementReason;
  source: StockMovementSource;
  /** The actor: an admin id, a hashed phone number, or 'system'. */
  createdBy: string;
  note?: string | null;
}

type StockTarget = { mode: 'delta'; delta: number } | { mode: 'absolute'; count: number };

/**
 * The locked core. Reads the current balance under a row lock, resolves the
 * target into a signed delta, guards against negative stock, then writes the
 * movement and the new balance in one transaction. A net-zero change writes
 * no ledger entry.
 */
async function applyStockChange(
  productId: string,
  target: StockTarget,
  meta: MovementMeta,
): Promise<StockResult> {
  return prisma.$transaction(async (tx) => {
    const locked = await tx.$queryRaw<{ stockQty: number }[]>`
      SELECT "stockQty" FROM "Product" WHERE "id" = ${productId} FOR UPDATE
    `;
    if (locked.length === 0) {
      throw new StockError('Product not found.', 'PRODUCT_NOT_FOUND');
    }

    const previousQty = locked[0].stockQty;
    const newQty = target.mode === 'delta' ? previousQty + target.delta : target.count;
    const delta = newQty - previousQty;

    if (newQty < 0) {
      throw new StockError(
        `Stock cannot go below zero — current ${previousQty}, change ${delta}.`,
        'STOCK_NEGATIVE',
      );
    }

    if (delta !== 0) {
      await tx.stockMovement.create({
        data: {
          productId,
          delta,
          balanceAfter: newQty,
          reason: meta.reason,
          source: meta.source,
          createdBy: meta.createdBy,
          note: meta.note ?? null,
        },
      });
      await tx.product.update({ where: { id: productId }, data: { stockQty: newQty } });
    }

    return { productId, previousQty, delta, newQty };
  });
}

/**
 * Apply a signed delta — for known quantities: an opening stock (+n), a
 * WhatsApp RESTOCK (+n), an order committing stock (−n).
 */
export async function recordStockMovement(args: {
  productId: string;
  delta: number;
  reason: StockMovementReason;
  source: StockMovementSource;
  createdBy: string;
  note?: string | null;
}): Promise<StockResult> {
  if (!Number.isInteger(args.delta)) {
    throw new StockError('Stock change must be a whole number.');
  }
  return applyStockChange(
    args.productId,
    { mode: 'delta', delta: args.delta },
    { reason: args.reason, source: args.source, createdBy: args.createdBy, note: args.note },
  );
}

/**
 * Set stock to an absolute count — the admin "edit stock" path. The admin
 * enters the new count; the delta is derived under the row lock, so it stays
 * correct even against a concurrent change.
 */
export async function setStockLevel(args: {
  productId: string;
  newCount: number;
  reason: StockMovementReason;
  source: StockMovementSource;
  createdBy: string;
  note?: string | null;
}): Promise<StockResult> {
  if (!Number.isInteger(args.newCount) || args.newCount < 0) {
    throw new StockError('Stock count must be a whole number, zero or greater.');
  }
  return applyStockChange(
    args.productId,
    { mode: 'absolute', count: args.newCount },
    { reason: args.reason, source: args.source, createdBy: args.createdBy, note: args.note },
  );
}
