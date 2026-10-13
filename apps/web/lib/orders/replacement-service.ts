/**
 * Replacements — free goods sent for a damaged or wrong item, as the refund
 * policy promises.
 *
 * A replacement is an ordinary order with a zero total, linked to the
 * original: it joins the "To pack" queue, gets its own number and tracking,
 * and takes stock with REPLACEMENT movements (not SALE, so sales figures stay
 * honest). Nothing is charged, so it is created already paid and confirmed.
 */
import {
  MULTI_STEP_TRANSACTION,
  OrderStatus,
  PaymentStatus,
  prisma,
  StockMovementReason,
  StockMovementSource,
} from '@dronagiri/db';

import { NotFoundError } from '@/lib/errors';
import { OrderStateError } from '@/lib/orders/admin-order-service';
import { nextOrderNumber, newTrackingToken } from '@/lib/orders/order-number';
import { commitOrderStockInTx, describeShortages } from '@/lib/orders/order-stock';

/** Goods can only be replaced once they have been sent. */
const REPLACEABLE: OrderStatus[] = [OrderStatus.SHIPPED, OrderStatus.DELIVERED];

export async function createReplacement(input: {
  orderId: string;
  lines: { productId: string; quantity: number }[];
  reason: string;
  adminId: string;
}): Promise<{ id: string; orderNumber: string }> {
  return prisma.$transaction(
    async (tx) => {
      const original = await tx.order.findUnique({
        where: { id: input.orderId },
        include: { items: true },
      });
      if (!original) throw new NotFoundError('That order does not exist.');
      if (!REPLACEABLE.includes(original.status)) {
        throw new OrderStateError('Only a shipped or delivered order can be replaced.');
      }

      const itemsByProduct = new Map(original.items.map((item) => [item.productId, item]));
      const lines = input.lines.filter((line) => line.quantity > 0);
      if (lines.length === 0) {
        throw new OrderStateError('Choose at least one item to replace.', 'NOTHING_TO_REPLACE');
      }
      for (const line of lines) {
        const item = itemsByProduct.get(line.productId);
        if (!item || line.quantity > item.quantity) {
          throw new OrderStateError(
            'A replacement can only include items from this order, up to the quantity ordered.',
            'REPLACEMENT_EXCEEDS_ORDER',
          );
        }
      }

      const now = new Date();
      const orderNumber = await nextOrderNumber(tx, now);
      const replacement = await tx.order.create({
        data: {
          orderNumber,
          trackingTokenHash: newTrackingToken().hash,
          customerId: original.customerId,
          replacementForId: original.id,
          status: OrderStatus.CONFIRMED,
          shipRecipientName: original.shipRecipientName,
          shipPhone: original.shipPhone,
          shipLine1: original.shipLine1,
          shipLine2: original.shipLine2,
          shipLandmark: original.shipLandmark,
          shipCity: original.shipCity,
          shipState: original.shipState,
          shipPincode: original.shipPincode,
          subtotalPaise: 0,
          totalPaise: 0,
          // Nothing to collect: no charge online, no cash at the door.
          paymentMethod: original.paymentMethod,
          paymentStatus: PaymentStatus.PAID,
          paidAt: now,
          internalNote: `Replacement for ${original.orderNumber}: ${input.reason}`,
          items: {
            create: lines.map((line) => {
              // Checked against the original's items above.
              const item = itemsByProduct.get(line.productId)!;
              return {
                productId: item.productId,
                productName: item.productName,
                productSlug: item.productSlug,
                unitPricePaise: 0,
                quantity: line.quantity,
                lineTotalPaise: 0,
              };
            }),
          },
          events: {
            create: {
              status: OrderStatus.CONFIRMED,
              note: `Replacement for ${original.orderNumber}: ${input.reason}`,
              createdBy: input.adminId,
            },
          },
        },
        select: { id: true, orderNumber: true },
      });

      const shortages = await commitOrderStockInTx(tx, {
        orderId: replacement.id,
        reason: StockMovementReason.REPLACEMENT,
        source: StockMovementSource.ADMIN_PANEL,
        createdBy: input.adminId,
        note: `Replacement for ${original.orderNumber}`,
      });
      if (shortages.length > 0) {
        // Throwing rolls the whole replacement back, number included.
        throw new OrderStateError(
          `Not enough stock to send a replacement: ${describeShortages(shortages)}. Restock first.`,
          'STOCK_SHORT',
        );
      }

      await tx.orderEvent.create({
        data: {
          orderId: original.id,
          status: original.status,
          note: `Replacement ${replacement.orderNumber} created: ${input.reason}`,
          createdBy: input.adminId,
        },
      });
      return replacement;
    },
    MULTI_STEP_TRANSACTION,
  );
}
