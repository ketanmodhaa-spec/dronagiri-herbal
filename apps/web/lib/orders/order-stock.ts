/**
 * Order stock — the stock side of an order's life, always inside the caller's
 * transaction so it commits or rolls back with the order change it belongs to.
 *
 *   commitOrderStockInTx   take every line's stock, or none of it.
 *   returnableQuantitiesInTx  what this order took and has not yet put back.
 *   restockOrderLinesInTx  put stock back (a cancellation or a return), never
 *                          more than the order took.
 *
 * What an order "took" is read from the ledger itself (its SALE / REPLACEMENT
 * movements minus its CANCELLATION / RETURN movements), so the answer is
 * right however many partial returns came before.
 */
import {
  StockMovementReason,
  Prisma,
  type DbTransaction,
  type StockMovementSource,
} from '@dronagiri/db';

import { recordStockMovementInTx, StockError } from '@/lib/inventory/stock-service';

export interface StockShortage {
  productName: string;
  ordered: number;
  inStock: number;
}

/** Movements that take stock out for an order, and those that put it back. */
const OUTBOUND: StockMovementReason[] = [StockMovementReason.SALE, StockMovementReason.REPLACEMENT];
const INBOUND: StockMovementReason[] = [StockMovementReason.CANCELLATION, StockMovementReason.RETURN];

/**
 * Take stock for every line of an order — all of it, or none of it.
 *
 * Every product is locked in id order (a fixed order, so two commits can never
 * deadlock) and checked before anything is written. Returns the shortages;
 * an empty list means the stock was taken.
 */
export async function commitOrderStockInTx(
  tx: DbTransaction,
  args: {
    orderId: string;
    reason: typeof StockMovementReason.SALE | typeof StockMovementReason.REPLACEMENT;
    source: StockMovementSource;
    createdBy: string;
    note?: string;
  },
): Promise<StockShortage[]> {
  const items = await tx.orderItem.findMany({
    where: { orderId: args.orderId },
    select: { productId: true, productName: true, quantity: true },
    orderBy: { productId: 'asc' },
  });
  if (items.length === 0) {
    throw new StockError('Order has no items.', 'ORDER_EMPTY');
  }

  const stock = await tx.$queryRaw<{ id: string; stockQty: number }[]>`
    SELECT "id", "stockQty" FROM "Product"
    WHERE "id" IN (${Prisma.join(items.map((item) => item.productId))})
    ORDER BY "id" FOR UPDATE
  `;
  const available = new Map(stock.map((row) => [row.id, row.stockQty]));
  const shortages = items
    .filter((item) => (available.get(item.productId) ?? 0) < item.quantity)
    .map((item) => ({
      productName: item.productName,
      ordered: item.quantity,
      inStock: available.get(item.productId) ?? 0,
    }));
  if (shortages.length > 0) return shortages;

  for (const item of items) {
    await recordStockMovementInTx(tx, {
      productId: item.productId,
      delta: -item.quantity,
      reason: args.reason,
      source: args.source,
      createdBy: args.createdBy,
      orderId: args.orderId,
      note: args.note,
    });
  }
  return [];
}

/** One sentence naming every shortage, for an order event or an alert. */
export function describeShortages(shortages: StockShortage[]): string {
  return shortages
    .map((item) => `${item.productName} (ordered ${item.ordered}, in stock ${item.inStock})`)
    .join('; ');
}

/** Per product: units this order has taken from stock and not yet put back. */
export async function returnableQuantitiesInTx(
  tx: DbTransaction,
  orderId: string,
): Promise<Map<string, number>> {
  const movements = await tx.stockMovement.groupBy({
    by: ['productId', 'reason'],
    where: { orderId, reason: { in: [...OUTBOUND, ...INBOUND] } },
    _sum: { delta: true },
  });
  const returnable = new Map<string, number>();
  for (const row of movements) {
    // Outbound deltas are negative and inbound positive, so the negated sum
    // is what is still out.
    returnable.set(row.productId, (returnable.get(row.productId) ?? 0) - (row._sum.delta ?? 0));
  }
  return returnable;
}

/**
 * Put stock back for some of an order's lines. Each quantity is checked
 * against what the order still has out, so stock can never be returned twice.
 */
export async function restockOrderLinesInTx(
  tx: DbTransaction,
  args: {
    orderId: string;
    lines: { productId: string; quantity: number }[];
    reason: typeof StockMovementReason.CANCELLATION | typeof StockMovementReason.RETURN;
    source: StockMovementSource;
    createdBy: string;
    note?: string;
  },
): Promise<void> {
  const returnable = await returnableQuantitiesInTx(tx, args.orderId);
  const lines = [...args.lines]
    .filter((line) => line.quantity > 0)
    .sort((a, b) => a.productId.localeCompare(b.productId));

  for (const line of lines) {
    const out = returnable.get(line.productId) ?? 0;
    if (line.quantity > out) {
      throw new StockError(
        `Only ${out} unit(s) of that product can go back to stock for this order.`,
        'RESTOCK_EXCEEDS_ORDER',
      );
    }
  }
  for (const line of lines) {
    await recordStockMovementInTx(tx, {
      productId: line.productId,
      delta: line.quantity,
      reason: args.reason,
      source: args.source,
      createdBy: args.createdBy,
      orderId: args.orderId,
      note: args.note,
    });
  }
}
