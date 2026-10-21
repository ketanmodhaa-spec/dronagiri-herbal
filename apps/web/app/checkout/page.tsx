/**
 * /checkout — delivery, billing and consent, then on to the pay page.
 * Exists only while the cart is switched on; never indexed.
 */
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { CheckoutForm } from '@/components/checkout/checkout-form';
import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { config } from '@/lib/config';
import { serverConfig } from '@/lib/config.server';
import { MARKETING_CONSENT_TEXT } from '@/lib/customers/consent-service';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default function CheckoutPage() {
  if (!config.cart.enabled) notFound();

  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-cream">
        <CheckoutForm flatShippingPaise={serverConfig.shipping.flatFeePaise} consentText={MARKETING_CONSENT_TEXT} />
      </main>
      <SiteFooter />
    </>
  );
}
