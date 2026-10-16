import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAdminOrNull } from '@/lib/auth/require-admin';
import { loyaltyByCustomer, SAMPLE_WINDOW } from '@/lib/customers/loyalty';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import {
  countOrdersForBadges,
  expireStaleUnpaidOrders,
  listOrders,
} from '@/lib/orders/admin-order-service';
import {
  DELIVERY_OVERDUE_DAYS,
  isOrderTab,
  ORDER_STATUS_LABEL,
  ORDER_TABS,
  PAYMENT_STATUS_LABEL,
} from '@/lib/orders/order-labels';

export const metadata: Metadata = { title: 'Orders' };
export const dynamic = 'force-dynamic';

const placedFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

const DAY_MS = 24 * 60 * 60 * 1000;

/** "Shipped today" / "Shipped 1 day ago" / "Shipped 9 days ago". */
function shippedAgo(shippedAt: Date, now: Date): { text: string; overdue: boolean } {
  const days = Math.floor((now.getTime() - shippedAt.getTime()) / DAY_MS);
  return {
    text: days === 0 ? 'Shipped today' : `Shipped ${days} day${days === 1 ? '' : 's'} ago`,
    overdue: days >= DELIVERY_OVERDUE_DAYS,
  };
}

/** How long a shipped order has been on the road — amber once delivery is overdue. */
function ShippedAge({ shippedAt, courierName, now }: { shippedAt: Date; courierName: string | null; now: Date }) {
  const age = shippedAgo(shippedAt, now);
  return (
    <p className={cn('mt-2 text-sm', age.overdue ? 'font-medium text-amber-700' : 'text-stone')}>
      {age.text}
      {courierName ? ` with ${courierName}` : ''}
      {age.overdue && ' — not marked delivered yet. Check with the courier.'}
    </p>
  );
}

const EMPTY_COPY: Record<(typeof ORDER_TABS)[number]['key'], string> = {
  attention: 'Nothing needs your attention.',
  'to-pack': 'Nothing to pack right now.',
  packed: 'No packed orders waiting for the courier.',
  shipped: 'No orders on the way. Shipped orders appear here, longest on the road first — mark each one delivered when the courier confirms it.',
  delivered: 'No delivered orders yet.',
  unpaid: 'No unpaid orders. Unpaid online orders are cancelled after 24 hours.',
  closed: 'No cancelled or refunded orders.',
};

export default async function AdminOrdersPage(props: { searchParams: Promise<{ tab?: string }> }) {
  const searchParams = await props.searchParams;
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }

  await expireStaleUnpaidOrders();
  const badges = await countOrdersForBadges();
  const tab = isOrderTab(searchParams.tab) ? searchParams.tab : badges.attention > 0 ? 'attention' : 'to-pack';
  const orders = await listOrders(tab);
  const loyalty = await loyaltyByCustomer(orders.map((order) => order.customerId));
  const now = new Date();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header>
        <Link href="/admin" className="text-sm text-forest-700 hover:text-forest-800">
          ← Dashboard
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold text-forest-900">Orders</h1>
      </header>

      <nav aria-label="Order status" className="-mx-5 mt-5 overflow-x-auto px-5">
        <ul className="flex gap-2 whitespace-nowrap pb-1">
          {ORDER_TABS.map((item) => {
            const count = item.key === 'attention' ? badges.attention : item.key === 'to-pack' ? badges.toPack : 0;
            const active = item.key === tab;
            return (
              <li key={item.key}>
                <Link
                  href={`/admin/orders?tab=${item.key}`}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                    active
                      ? 'border-forest-800 bg-forest-800 text-white'
                      : 'border-forest-200 bg-white text-forest-800 hover:bg-forest-50',
                  )}
                >
                  {item.label}
                  {count > 0 && (
                    <span
                      className={cn(
                        'rounded-full px-1.5 text-xs font-semibold',
                        item.key === 'attention' ? 'bg-red-600 text-white' : 'bg-gold text-forest-900',
                      )}
                    >
                      {count}
                    </span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {orders.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-forest-100 bg-white p-6 text-sm text-stone">
          {EMPTY_COPY[tab]}
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`/admin/orders/${order.id}`}
                className={cn(
                  'block rounded-2xl border bg-white p-4 transition-colors hover:bg-forest-50',
                  order.attentionReason ? 'border-red-300' : 'border-forest-100',
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-base font-semibold text-forest-900">
                      {order.orderNumber}
                      {order.replacementForId && (
                        <span className="ml-2 rounded-full bg-gold-light px-2 py-0.5 align-middle font-body text-xs font-medium text-forest-900">
                          Replacement
                        </span>
                      )}
                    </p>
                    <p className="truncate text-sm text-stone">
                      {order.shipRecipientName}, {order.shipCity} · {order._count.items} item
                      {order._count.items === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-medium text-forest-900">{formatPrice(order.totalPaise)}</p>
                    <p className="text-xs text-stone">{placedFormatter.format(order.createdAt)}</p>
                  </div>
                </div>
                <p className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  <span className="rounded-full bg-forest-100 px-2 py-0.5 text-forest-800">
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>
                  <span className="rounded-full bg-forest-50 px-2 py-0.5 text-forest-800">
                    {order.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online'} ·{' '}
                    {PAYMENT_STATUS_LABEL[order.paymentStatus]}
                  </span>
                  {loyalty.get(order.customerId)?.isLoyal &&
                    !order.replacementForId &&
                    SAMPLE_WINDOW.includes(order.status) &&
                    (order.sampleAddedAt ? (
                      <span className="rounded-full bg-forest-100 px-2 py-0.5 text-forest-800">🎁 Sample added</span>
                    ) : (
                      <span className="rounded-full bg-gold px-2 py-0.5 font-medium text-forest-900">🎁 Add sample</span>
                    ))}
                </p>
                {order.status === 'SHIPPED' && order.shippedAt && (
                  <ShippedAge shippedAt={order.shippedAt} courierName={order.courierName} now={now} />
                )}
                {order.attentionReason && (
                  <p className="mt-2 line-clamp-2 text-sm text-red-700">{order.attentionReason}</p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
