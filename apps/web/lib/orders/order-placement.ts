/**
 * Order placement — the one way an online order comes into being, whether
 * the customer checks out or Sarita creates it for a WhatsApp enquiry.
 *
 * Prices come from the catalogue and shipping from the published policy;
 * nothing is charged or reserved here. The order waits as PENDING / ONLINE
 * until the payment layer confirms it and takes stock. A double submit with
 * the same idempotency key returns the first order. Every line keeps its own
 * price, HSN and GST rate, and the billing party is frozen with the order, so
 * the invoice never shifts afterwards.
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
import type { OrderBilling, ShippingAddress } from '@dronagiri/validators';

import { serverConfig } from '@/lib/config.server';
import { recordMarketingConsentInTx } from '@/lib/customers/consent-service';
import { customerPhoneFromIndianMobile } from '@/lib/customers/customer-phone';
import { ValidationError } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { OrderStateError } from '@/lib/orders/admin-order-service';
import { nextOrderNumber, newTrackingToken } from '@/lib/orders/order-number';

/** Razorpay's minimum charge: ₹1. */
const MIN_CHARGE_PAISE = 100;

export interface PlaceOrderInput {
  shippingAddress: ShippingAddress;
  billing: OrderBilling;
  lines: { productId: string; quantity: number }[];
  /** Owner's discretion — only Sarita's admin form can set it. */
  waiveShipping: boolean;
  /** Only `true` records consent — the unticked checkout box. */
  marketingConsent: boolean;
  idempotencyKey: string;
  internalNote?: string;
  /** Who placed it, for the order history: an admin id, or the system actor. */
  createdBy: string;
  /** First line of the order history, e.g. "Placed online by the customer". */
  eventNote: string;
}

export interface CreatedOrder {
  id: string;
  orderNumber: string;
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

/** Billing as stored on the order: nulls mean "same as shipping" / "not a business". */
function billingSnapshot(billing: OrderBilling) {
  const address = billing.billingAddress;
  return {
    billName: address?.name ?? null,
    billLine1: address?.line1 ?? null,
    billLine2: address?.line2 || null,
    billCity: address?.city ?? null,
    billState: address?.state ?? null,
    billPincode: address?.pincode ?? null,
    buyerGstin: billing.business?.gstin ?? null,
    buyerBusinessName: billing.business?.businessName ?? null,
  };
}

/** The order a submit with this key already placed, if any. */
export async function findByIdempotencyKey(key: string): Promise<CreatedOrder | null> {
  return prisma.order.findUnique({ where: { idempotencyKey: key }, select: { id: true, orderNumber: true } });
}

export async function placeOnlineOrder(input: PlaceOrderInput): Promise<CreatedOrder> {
  const repeat = await findByIdempotencyKey(input.idempotencyKey);
  if (repeat) return repeat;

  const address = input.shippingAddress;
  try {
    return await prisma.$transaction(async (tx) => {
      const products = await tx.product.findMany({
        where: { id: { in: input.lines.map((line) => line.productId) } },
        select: {
          id: true,
          name: true,
          slug: true,
          pricePaise: true,
          stockQty: true,
          isActive: true,
          hsnCode: true,
          gstRateBps: true,
        },
      });
      const byId = new Map(products.map((product) => [product.id, product]));

      const items = input.lines.map((line) => {
        const product = byId.get(line.productId);
        if (!product || !product.isActive) {
          throw new ValidationError('One of the products is no longer on sale. Remove it and try again.', 'PRODUCT_UNAVAILABLE');
        }
        // Checked here so nobody pays for goods that cannot be sent;
        // settlement re-checks under lock when the payment arrives.
        if (product.stockQty < line.quantity) {
          throw new OrderStateError(
            product.stockQty === 0
              ? `${product.name} has just sold out. Remove it to continue.`
              : `Only ${product.stockQty} of ${product.name} left. Lower the quantity to continue.`,
            'STOCK_SHORT',
          );
        }
        return {
          productId: product.id,
          productName: product.name,
          productSlug: product.slug,
          unitPricePaise: product.pricePaise,
          quantity: line.quantity,
          lineTotalPaise: product.pricePaise * line.quantity,
          // Frozen with the price: the invoice for this order never shifts.
          hsnCode: product.hsnCode,
          gstRateBps: product.gstRateBps,
        };
      });

      const subtotalPaise = items.reduce((sum, item) => sum + item.lineTotalPaise, 0);
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
      if (input.marketingConsent) {
        await recordMarketingConsentInTx(tx, customerId);
      }

      return tx.order.create({
        data: {
          orderNumber: await nextOrderNumber(tx),
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
          ...billingSnapshot(input.billing),
          subtotalPaise,
          shippingPaise,
          totalPaise,
          paymentMethod: PaymentMethod.ONLINE,
          paymentStatus: PaymentStatus.PENDING,
          internalNote: input.internalNote || null,
          items: { create: items },
          events: { create: { status: OrderStatus.PENDING, note: input.eventNote, createdBy: input.createdBy } },
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
