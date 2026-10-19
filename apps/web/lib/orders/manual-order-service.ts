/**
 * Orders Sarita creates for a customer — a WhatsApp or phone enquiry turned
 * into a website order, paid online through a private link
 * (lib/orders/pay-link.ts).
 *
 * The same rules as checkout: prices come from the catalogue, shipping from
 * the published policy, and nothing is charged or reserved here. The order
 * waits as PENDING / ONLINE; the payment layer confirms it and takes stock
 * when the money arrives, exactly as for any online order. An unpaid order
 * lapses after 24 hours (expireStaleUnpaidOrders).
 */
import {
  MULTI_STEP_TRANSACTION,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  Prisma,
  prisma,
  type DbTransaction,
} from '@dronagiri/db';
import type { AdminManualOrder } from '@dronagiri/validators';

import { serverConfig } from '@/lib/config.server';
import { ValidationError } from '@/lib/errors';
import { customerPhoneFromIndianMobile } from '@/lib/customers/customer-phone';
import { formatPrice } from '@/lib/format';
import { OrderStateError } from '@/lib/orders/admin-order-service';
import { nextOrderNumber, newTrackingToken } from '@/lib/orders/order-number';

/** Razorpay's minimum charge: ₹1. */
const MIN_CHARGE_PAISE = 100;

export interface CreatedOrder {
  id: string;
  orderNumber: string;
}

/** Products Sarita can put on an order: everything on sale, alphabetically, with live price and stock. */
export async function listOrderableProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, sizeLabel: true, pricePaise: true, stockQty: true },
  });
}

/** Shipping per the published policy: free from the threshold up, a flat fee below it. */
export function shippingPaiseFor(subtotalPaise: number, waive: boolean): number {
  if (waive || subtotalPaise >= serverConfig.shipping.freeThresholdPaise) return 0;
  return serverConfig.shipping.flatFeePaise;
}

/** The customer behind a phone number — created phone-first if new (CLAUDE.md: one identity model). */
async function findOrCreateCustomerInTx(tx: DbTransaction, phone: string, name: string): Promise<string> {
  const existing = await tx.customer.findUnique({ where: { phone }, select: { id: true, name: true } });
  if (!existing) {
    const created = await tx.customer.create({ data: { phone, name }, select: { id: true } });
    return created.id;
  }
  if (!existing.name) {
    await tx.customer.update({ where: { id: existing.id }, data: { name } });
  }
  return existing.id;
}

async function findByIdempotencyKey(key: string): Promise<CreatedOrder | null> {
  return prisma.order.findUnique({
    where: { idempotencyKey: key },
    select: { id: true, orderNumber: true },
  });
}

export async function createManualOrder(input: AdminManualOrder, adminId: string): Promise<CreatedOrder> {
  const repeat = await findByIdempotencyKey(input.idempotencyKey);
  if (repeat) return repeat;

  const address = input.shippingAddress;
  try {
    return await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: input.items.map((item) => item.productId) } },
        select: { id: true, name: true, slug: true, pricePaise: true, stockQty: true, isActive: true },
      });
      const byId = new Map(products.map((product) => [product.id, product]));

      const lines = input.items.map((item) => {
        const product = byId.get(item.productId);
        if (!product || !product.isActive) {
          throw new ValidationError('One of the products is no longer on sale. Remove it and try again.', 'PRODUCT_UNAVAILABLE');
        }
        // Checked here so Sarita is not left with a paid order she cannot send;
        // settlement re-checks under lock when the payment arrives.
        if (product.stockQty < item.quantity) {
          throw new OrderStateError(
            `Only ${product.stockQty} of ${product.name} in stock. Restock it or lower the quantity.`,
            'STOCK_SHORT',
          );
        }
        return {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          unitPricePaise: product.pricePaise,
          quantity: item.quantity,
          lineTotalPaise: product.pricePaise * item.quantity,
        };
      });

      const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
      const shippingPaise = shippingPaiseFor(subtotalPaise, input.waiveShipping);
      const totalPaise = subtotalPaise + shippingPaise;
      if (totalPaise < MIN_CHARGE_PAISE) {
        throw new ValidationError(`The total must be at least ${formatPrice(MIN_CHARGE_PAISE)} to pay online.`, 'TOTAL_TOO_LOW');
      }

      const customerId = await findOrCreateCustomerInTx(
        tx,
        customerPhoneFromIndianMobile(address.phone),
        address.recipientName,
      );
      const orderNumber = await nextOrderNumber(tx);
      const note = input.waiveShipping && subtotalPaise < serverConfig.shipping.freeThresholdPaise
        ? 'Created in admin · shipping waived · awaiting online payment'
        : 'Created in admin · awaiting online payment';

      return tx.order.create({
        data: {
          orderNumber,
          trackingTokenHash: newTrackingToken().hash,
          idempotencyKey: input.idempotencyKey,
          customerId,
          status: OrderStatus.PENDING,
          shipRecipientName: address.recipientName,
          shipPhone: address.phone,
          shipLine1: address.line1,
          shipLine2: address.line2 || null,
          shipLandmark: address.landmark || null,
          shipCity: address.city,
          shipState: address.state,
          shipPincode: address.pincode,
          subtotalPaise,
          shippingPaise,
          totalPaise,
          paymentMethod: PaymentMethod.ONLINE,
          paymentStatus: PaymentStatus.PENDING,
          internalNote: input.internalNote || null,
          items: { create: lines },
          events: { create: { status: OrderStatus.PENDING, note, createdBy: adminId } },
        },
        select: { id: true, orderNumber: true },
      });
    }, MULTI_STEP_TRANSACTION);
  } catch (error) {
    // A double tap that raced past the first check: return the order the other request made.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      const raced = await findByIdempotencyKey(input.idempotencyKey);
      if (raced) return raced;
    }
    throw error;
  }
}
