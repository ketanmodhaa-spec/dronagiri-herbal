/**
 * Loyalty — who has earned a surprise sample in their parcel.
 *
 * There are no accounts: a customer is their phone number, so every order
 * from the same number counts. A customer is loyal from their third real
 * order, or once they have spent ₹1,500 in total. "Real" means a placed order
 * that was not cancelled and is not a free replacement: online orders once
 * paid, cash orders once placed.
 */
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma, prisma } from '@dronagiri/db';

/** Loyal from this many real orders (the current one included)… */
export const LOYAL_FROM_ORDERS = 3;
/** …or from this much lifetime spend, in paise (₹1,500). */
export const LOYAL_FROM_SPEND_PAISE = 1_500_00;

export interface CustomerLoyalty {
  orders: number;
  lifetimePaise: number;
  firstOrderAt: Date | null;
  isLoyal: boolean;
}

const REAL_ORDER: Prisma.OrderWhereInput = {
  replacementForId: null,
  status: { not: OrderStatus.CANCELLED },
  OR: [
    { paymentMethod: PaymentMethod.COD },
    { paymentStatus: { in: [PaymentStatus.PAID, PaymentStatus.REFUNDED] } },
  ],
};

/** Loyalty for several customers at once — one query, for list pages. */
export async function loyaltyByCustomer(customerIds: string[]): Promise<Map<string, CustomerLoyalty>> {
  const unique = [...new Set(customerIds)];
  const result = new Map<string, CustomerLoyalty>();
  if (unique.length === 0) return result;

  const rows = await prisma.order.groupBy({
    by: ['customerId'],
    where: { ...REAL_ORDER, customerId: { in: unique } },
    _count: { _all: true },
    _sum: { totalPaise: true },
    _min: { createdAt: true },
  });
  for (const id of unique) {
    const row = rows.find((candidate) => candidate.customerId === id);
    const orders = row?._count._all ?? 0;
    const lifetimePaise = row?._sum.totalPaise ?? 0;
    result.set(id, {
      orders,
      lifetimePaise,
      firstOrderAt: row?._min.createdAt ?? null,
      isLoyal: orders >= LOYAL_FROM_ORDERS || lifetimePaise >= LOYAL_FROM_SPEND_PAISE,
    });
  }
  return result;
}

export async function loyaltyOf(customerId: string): Promise<CustomerLoyalty> {
  const map = await loyaltyByCustomer([customerId]);
  // loyaltyByCustomer returns an entry for every id it is given.
  return map.get(customerId)!;
}

/** Statuses at which the parcel is still open — a sample can still go in. */
export const SAMPLE_WINDOW: OrderStatus[] = [OrderStatus.CONFIRMED, OrderStatus.PACKED];
