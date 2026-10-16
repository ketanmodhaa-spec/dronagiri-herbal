import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import { cuidSchema } from '@dronagiri/validators';

import { OrderRefundForm } from '@/components/admin/order-refund-form';
import { OrderSamplePanel } from '@/components/admin/order-sample-panel';
import { OrderReplacementForm } from '@/components/admin/order-replacement-form';
import { OrderStatusActions } from '@/components/admin/order-status-actions';
import { RefundSyncButton } from '@/components/admin/refund-sync-button';
import { ReviewLinkPanel } from '@/components/admin/review-link-panel';
import { getAdminOrNull } from '@/lib/auth/require-admin';
import { loyaltyOf, SAMPLE_WINDOW } from '@/lib/customers/loyalty';
import { NotFoundError } from '@/lib/errors';
import { formatPrice } from '@/lib/format';
import { getOrderDetail, type OrderDetail } from '@/lib/orders/admin-order-service';
import { reviewUrl } from '@/lib/reviews/review-link';
import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  REFUND_STATUS_LABEL,
  SYSTEM_ACTOR,
} from '@/lib/orders/order-labels';

export const metadata: Metadata = { title: 'Order' };
export const dynamic = 'force-dynamic';

const monthYear = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'short', year: 'numeric' });

const timeFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

async function loadOrder(id: string): Promise<OrderDetail> {
  if (!cuidSchema.safeParse(id).success) notFound();
  try {
    return await getOrderDetail(id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-forest-100 bg-white p-5">
      <h2 className="mb-3 font-display text-lg font-semibold text-forest-900">{title}</h2>
      {children}
    </section>
  );
}

export default async function AdminOrderPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const admin = await getAdminOrNull();
  if (!admin) {
    redirect('/admin/login');
  }
  const order = await loadOrder(params.id);
  const isOwner = admin.role === 'OWNER';
  const isCashOrder = order.paymentMethod === 'COD';
  const loyalty = await loyaltyOf(order.customerId);
  const loyaltySummary =
    `${loyalty.orders} order${loyalty.orders === 1 ? '' : 's'} · ${formatPrice(loyalty.lifetimePaise)} spent` +
    (loyalty.firstOrderAt ? ` since ${monthYear.format(loyalty.firstOrderAt)}` : '');
  const showSample =
    loyalty.isLoyal && !order.replacementForId && (order.sampleNote !== null || SAMPLE_WINDOW.includes(order.status));
  const sampleDue = loyalty.isLoyal && !order.replacementForId && order.sampleAddedAt === null && SAMPLE_WINDOW.includes(order.status);
  const actor = (id: string | null) =>
    id === null || id === SYSTEM_ACTOR ? 'Automatic' : (order.actorNames[id] ?? 'Admin');

  return (
    <main className="mx-auto max-w-3xl space-y-4 px-5 py-12">
      <header>
        <Link href="/admin/orders" className="text-sm text-forest-700 hover:text-forest-800">
          ← Orders
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold text-forest-900">{order.orderNumber}</h1>
        <p className="mt-1 flex flex-wrap gap-1.5 text-sm">
          <span className="rounded-full bg-forest-100 px-2.5 py-0.5 text-forest-800">
            {ORDER_STATUS_LABEL[order.status]}
          </span>
          <span className="rounded-full bg-forest-50 px-2.5 py-0.5 text-forest-800">
            {isCashOrder ? 'Cash on delivery' : 'Online'} · {PAYMENT_STATUS_LABEL[order.paymentStatus]}
          </span>
          <span className="px-1 text-stone">Placed {timeFormatter.format(order.createdAt)}</span>
        </p>
        {order.replacementFor && (
          <p className="mt-2 text-sm text-forest-800">
            Free replacement for{' '}
            <Link href={`/admin/orders/${order.replacementFor.id}`} className="font-medium underline">
              {order.replacementFor.orderNumber}
            </Link>
          </p>
        )}
      </header>

      <OrderStatusActions
        orderId={order.id}
        status={order.status}
        paymentStatus={order.paymentStatus}
        attentionReason={order.attentionReason}
        isOwner={isOwner}
        refundOnCancelPaise={isCashOrder ? 0 : order.refundablePaise}
        sampleDue={sampleDue}
      />

      {showSample && (
        <OrderSamplePanel
          orderId={order.id}
          loyaltySummary={loyaltySummary}
          sampleNote={order.sampleNote}
          canStillAdd={SAMPLE_WINDOW.includes(order.status)}
        />
      )}

      <Section title="Items">
        <ul className="divide-y divide-forest-100 text-sm">
          {order.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-2">
              <span className="text-forest-900">
                {item.productName} × {item.quantity}
              </span>
              <span className="text-forest-900">{formatPrice(item.lineTotalPaise)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-forest-100 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone">Subtotal</dt>
            <dd>{formatPrice(order.subtotalPaise)}</dd>
          </div>
          {order.discountPaise > 0 && (
            <div className="flex justify-between">
              <dt className="text-stone">Discount</dt>
              <dd>−{formatPrice(order.discountPaise)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-stone">Shipping</dt>
            <dd>{order.shippingPaise === 0 ? 'Free' : formatPrice(order.shippingPaise)}</dd>
          </div>
          <div className="flex justify-between font-semibold text-forest-900">
            <dt>Total</dt>
            <dd>{formatPrice(order.totalPaise)}</dd>
          </div>
        </dl>
      </Section>

      <Section title="Customer">
        <p className="text-sm text-forest-900">
          {order.customer.name ?? order.shipRecipientName} · {order.customer.phone}
        </p>
        <p className="mt-1 text-sm text-stone">
          {loyalty.orders <= 1 ? 'First order' : loyaltySummary}
          {loyalty.isLoyal && <span className="ml-2 rounded-full bg-gold-light px-2 py-0.5 text-xs text-forest-900">Loyal</span>}
        </p>
      </Section>

      <Section title="Ship to">
        <address className="text-sm not-italic leading-relaxed text-forest-900">
          {order.shipRecipientName}
          <br />
          {order.shipLine1}
          {order.shipLine2 && (
            <>
              <br />
              {order.shipLine2}
            </>
          )}
          {order.shipLandmark && (
            <>
              <br />
              Near {order.shipLandmark}
            </>
          )}
          <br />
          {order.shipCity}, {order.shipState} {order.shipPincode}
        </address>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <a href={`tel:+91${order.shipPhone}`} className="font-medium text-forest-700 underline">
            Call +91 {order.shipPhone}
          </a>
          <a href={`https://wa.me/91${order.shipPhone}`} className="font-medium text-forest-700 underline">
            WhatsApp
          </a>
        </div>
        {order.courierName && (
          <p className="mt-3 text-sm text-forest-900">
            {order.courierName} · tracking <span className="font-mono">{order.trackingNumber}</span>
          </p>
        )}
        {order.customerNote && (
          <p className="mt-3 rounded-lg bg-forest-50 p-3 text-sm">Customer note: {order.customerNote}</p>
        )}
      </Section>

      <Section title="Payment">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between gap-3">
            <dt className="text-stone">Method</dt>
            <dd>{isCashOrder ? 'Cash on delivery' : 'Online (Razorpay)'}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-stone">Status</dt>
            <dd>{PAYMENT_STATUS_LABEL[order.paymentStatus]}</dd>
          </div>
          {order.paidAt && (
            <div className="flex justify-between gap-3">
              <dt className="text-stone">Paid</dt>
              <dd>{timeFormatter.format(order.paidAt)}</dd>
            </div>
          )}
          {order.razorpayPaymentId && (
            <div className="flex justify-between gap-3">
              <dt className="text-stone">Razorpay payment</dt>
              <dd>
                <a
                  href={`https://dashboard.razorpay.com/app/payments/${order.razorpayPaymentId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono text-forest-700 underline"
                >
                  {order.razorpayPaymentId}
                </a>
              </dd>
            </div>
          )}
        </dl>
      </Section>

      {(order.refunds.length > 0 || (isOwner && order.refundablePaise > 0)) && (
        <Section title="Refunds">
          {order.refunds.length > 0 && (
            <ul className="mb-4 divide-y divide-forest-100 text-sm">
              {order.refunds.map((refund) => (
                <li key={refund.id} className="flex items-start justify-between gap-3 py-2">
                  <div>
                    <p className="font-medium text-forest-900">
                      {formatPrice(refund.amountPaise)} — {REFUND_STATUS_LABEL[refund.status]}
                    </p>
                    <p className="text-stone">{refund.reason}</p>
                    <p className="text-xs text-stone">
                      {timeFormatter.format(refund.createdAt)} · {actor(refund.createdBy)}
                      {refund.manualReference && ` · ref ${refund.manualReference}`}
                      {refund.razorpayRefundId && ` · ${refund.razorpayRefundId}`}
                    </p>
                    {refund.failureReason && <p className="text-xs text-red-700">{refund.failureReason}</p>}
                  </div>
                  {refund.status === 'PENDING' && <RefundSyncButton orderId={order.id} refundId={refund.id} />}
                </li>
              ))}
            </ul>
          )}
          {isOwner && order.refundablePaise > 0 && (
            <OrderRefundForm
              orderId={order.id}
              refundablePaise={order.refundablePaise}
              isCashOrder={isCashOrder}
              lines={order.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                returnable: order.returnable[item.productId] ?? 0,
              }))}
            />
          )}
        </Section>
      )}

      {(order.status === 'SHIPPED' || order.status === 'DELIVERED' || order.replacements.length > 0) && (
        <Section title="Replacements">
          {order.replacements.length > 0 && (
            <ul className="mb-4 space-y-1 text-sm">
              {order.replacements.map((replacement) => (
                <li key={replacement.id}>
                  <Link href={`/admin/orders/${replacement.id}`} className="font-medium text-forest-700 underline">
                    {replacement.orderNumber}
                  </Link>{' '}
                  — {ORDER_STATUS_LABEL[replacement.status]}
                </li>
              ))}
            </ul>
          )}
          {(order.status === 'SHIPPED' || order.status === 'DELIVERED') && (
            <OrderReplacementForm
              orderId={order.id}
              lines={order.items.map((item) => ({
                productId: item.productId,
                productName: item.productName,
                quantity: item.quantity,
              }))}
            />
          )}
        </Section>
      )}

      {order.deliveredAt && !order.replacementForId && (
        <Section title="Customer review">
          <ReviewLinkPanel
            url={reviewUrl(order.id)}
            phone={order.shipPhone}
            firstName={order.shipRecipientName.split(/\s+/)[0] ?? order.shipRecipientName}
            reviewCount={order._count.reviews}
            productCount={order.items.length}
          />
        </Section>
      )}

      <Section title="History">
        <ol className="space-y-3 text-sm">
          {order.events.map((event) => (
            <li key={event.id} className="border-l-2 border-forest-200 pl-3">
              <p className="text-forest-900">{event.note ?? ORDER_STATUS_LABEL[event.status]}</p>
              <p className="text-xs text-stone">
                {timeFormatter.format(event.createdAt)} · {actor(event.createdBy)}
              </p>
            </li>
          ))}
        </ol>
      </Section>
    </main>
  );
}
