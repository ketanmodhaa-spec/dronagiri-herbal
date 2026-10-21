/**
 * Orders Sarita creates for a customer — a WhatsApp or phone enquiry, or a
 * bulk buyer, turned into a website order and paid online through a private
 * link (lib/orders/pay-link.ts). Placement itself is shared with checkout
 * (lib/orders/order-placement.ts); only the admin's choices live here.
 */
import { prisma } from '@dronagiri/db';
import type { AdminManualOrder } from '@dronagiri/validators';

import { placeOnlineOrder, type CreatedOrder } from '@/lib/orders/order-placement';

export type { CreatedOrder };

/** Products Sarita can put on an order: everything on sale, alphabetically, with live price and stock. */
export async function listOrderableProducts() {
  return prisma.product.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, sizeLabel: true, pricePaise: true, stockQty: true },
  });
}

export async function createManualOrder(input: AdminManualOrder, adminId: string): Promise<CreatedOrder> {
  return placeOnlineOrder({
    shippingAddress: input.shippingAddress,
    billing: input.billing,
    lines: input.items,
    waiveShipping: input.waiveShipping,
    marketingConsent: false,
    idempotencyKey: input.idempotencyKey,
    internalNote: input.internalNote,
    createdBy: adminId,
    eventNote: input.waiveShipping
      ? 'Created in admin · shipping waived · awaiting online payment'
      : 'Created in admin · awaiting online payment',
  });
}
