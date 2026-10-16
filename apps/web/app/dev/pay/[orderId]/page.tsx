/**
 * /dev/pay/[orderId] — local test harness for the Razorpay payment layer.
 *
 * Opens the real checkout widget for an existing PENDING online order, so the
 * whole loop (Razorpay order → widget → verify → capture → stock committed)
 * can be exercised before checkout exists. Orders come from
 * `scripts/razorpay-test-order.ts`.
 *
 * Exists only in `next dev` with test keys: any production build, or live
 * keys, and this route is a 404.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { prisma } from '@dronagiri/db';

import { RazorpayPayButton } from '@/components/checkout/razorpay-pay-button';
import { Container } from '@/components/ui/container';
import { serverConfig } from '@/lib/config.server';
import { formatPrice } from '@/lib/format';
import { PaymentError } from '@/lib/payments/payment-error';
import { startOnlinePayment, type PaymentHandoff } from '@/lib/payments/payment-service';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Payment test',
  robots: { index: false, follow: false },
};

export default async function DevPayPage(props: { params: Promise<{ orderId: string }> }) {
  const params = await props.params;
  if (serverConfig.isProduction || !serverConfig.razorpay.isTestMode) {
    notFound();
  }

  const order = await prisma.order.findUnique({
    where: { id: params.orderId },
    select: {
      orderNumber: true,
      status: true,
      paymentStatus: true,
      totalPaise: true,
      items: { select: { productName: true, quantity: true, lineTotalPaise: true } },
    },
  });
  if (!order) {
    notFound();
  }

  let handoff: PaymentHandoff | null = null;
  let unavailable: string | null = null;
  try {
    handoff = await startOnlinePayment(params.orderId);
  } catch (error) {
    if (!(error instanceof PaymentError)) throw error;
    unavailable = error.message;
  }

  return (
    <Container className="max-w-xl py-12">
      <p className="mb-2 font-body text-xs font-medium uppercase tracking-wide text-red-700">
        Test mode — no real money moves
      </p>
      <h1 className="mb-6 font-display text-3xl text-forest-900">Order {order.orderNumber}</h1>

      <ul className="mb-4 divide-y divide-forest-100 rounded-xl border border-forest-100 bg-white">
        {order.items.map((item) => (
          <li key={item.productName} className="flex justify-between px-4 py-3 font-body text-sm">
            <span>
              {item.productName} × {item.quantity}
            </span>
            <span>{formatPrice(item.lineTotalPaise)}</span>
          </li>
        ))}
        <li className="flex justify-between px-4 py-3 font-body font-medium">
          <span>Total</span>
          <span>{formatPrice(order.totalPaise)}</span>
        </li>
      </ul>
      <p className="mb-8 font-body text-sm text-forest-800">
        Status: {order.status} · Payment: {order.paymentStatus}
      </p>

      {handoff ? (
        <RazorpayPayButton handoff={handoff} />
      ) : (
        <p className="font-body text-sm text-forest-800">{unavailable}</p>
      )}

      <p className="mt-10 font-body text-xs text-forest-800">
        UPI: success@razorpay (or failure@razorpay to test a failed payment). Card: 5267 3181 8797 5449
        (Indian Mastercard), any future expiry, any CVV, then Success on the test bank page.
      </p>
    </Container>
  );
}
