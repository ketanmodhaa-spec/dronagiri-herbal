/**
 * /pay/[token] — pay for an order Sarita created, from the link she sent.
 *
 * The signed token is the only key (no login), the amount always comes from
 * the order on the server, and payment confirms through the same verify +
 * webhook path as every online order. Never indexed.
 */
import type { Metadata } from 'next';

import { RazorpayPayButton } from '@/components/checkout/razorpay-pay-button';
import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Container } from '@/components/ui/container';
import { formatPrice } from '@/lib/format';
import { getPayPage, type PayPageState } from '@/lib/payments/pay-page-service';

export const metadata: Metadata = {
  title: 'Pay for your order',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const HELP_URL = 'https://wa.me/919429029840';

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-forest-100 bg-white p-6 text-forest-900">
      <p className="font-display text-xl font-semibold">{title}</p>
      <p className="mt-2 text-stone">{children}</p>
    </div>
  );
}

function ClosedState({ state }: { state: Exclude<PayPageState, { kind: 'open' }> }) {
  switch (state.kind) {
    case 'invalid':
      return (
        <Notice title="This payment link is not valid">
          Please use the link from your WhatsApp message, or{' '}
          <a href={HELP_URL} className="font-medium text-forest-800 underline">message us</a>.
        </Notice>
      );
    case 'paid':
      return (
        <Notice title={`Order ${state.orderNumber} is paid — thank you!`}>
          We are preparing your parcel and will message you when it ships.
        </Notice>
      );
    case 'unavailable':
      return (
        <Notice title="Payment is briefly unavailable">
          We could not reach our payment partner just now. Please refresh this page in a minute — your
          order {state.orderNumber} is safe and nothing has been charged.
        </Notice>
      );
    case 'closed':
      return (
        <Notice title={`Order ${state.orderNumber} can no longer be paid`}>
          It was cancelled or the link has lapsed. Please{' '}
          <a href={HELP_URL} className="font-medium text-forest-800 underline">message us on WhatsApp</a> and
          we will send a fresh one.
        </Notice>
      );
  }
}

export default async function PayPage(props: { params: Promise<{ token: string }> }) {
  const { token } = await props.params;
  const state = await getPayPage(token);

  return (
    <>
      <SiteHeader />
      <main className="bg-cream py-12 md:py-16">
        <Container className="max-w-xl">
          <h1 className="font-display text-3xl font-semibold text-forest-900">Pay for your order</h1>

          {state.kind !== 'open' ? (
            <ClosedState state={state} />
          ) : (
            <>
              <p className="mt-2 text-stone">
                Namaste {state.summary.firstName} — here is your order {state.summary.orderNumber}, to be
                delivered in {state.summary.city}.
              </p>

              <ul className="mt-6 divide-y divide-forest-100 rounded-2xl border border-forest-100 bg-white">
                {state.summary.items.map((item) => (
                  <li key={item.name} className="flex justify-between gap-4 px-5 py-3 text-sm text-forest-900">
                    <span>
                      {item.name} × {item.quantity}
                    </span>
                    <span>{formatPrice(item.lineTotalPaise)}</span>
                  </li>
                ))}
                <li className="flex justify-between px-5 py-3 text-sm text-stone">
                  <span>Shipping</span>
                  <span>{state.summary.shippingPaise === 0 ? 'Free' : formatPrice(state.summary.shippingPaise)}</span>
                </li>
                <li className="flex justify-between px-5 py-4 font-medium text-forest-900">
                  <span>Total</span>
                  <span>{formatPrice(state.summary.totalPaise)}</span>
                </li>
              </ul>

              <div className="mt-8">
                <RazorpayPayButton handoff={state.handoff} />
              </div>
              <p className="mt-4 text-xs text-stone">
                Secure payment by Razorpay — UPI, cards and netbanking. Questions?{' '}
                <a href={HELP_URL} className="underline">Message us on WhatsApp</a>.
              </p>
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
