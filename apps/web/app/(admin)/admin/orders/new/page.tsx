import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { INDIAN_STATES, stateName } from '@dronagiri/validators';

import { ManualOrderForm } from '@/components/admin/manual-order-form';
import { getAdminOrNull } from '@/lib/auth/require-admin';
import { serverConfig } from '@/lib/config.server';
import { listOrderableProducts } from '@/lib/orders/manual-order-service';

export const metadata: Metadata = { title: 'New order' };
export const dynamic = 'force-dynamic';

/** Most orders ship within Gujarat — the seller's own state (GST code 24). */
const HOME_STATE = stateName('24');

export default async function NewOrderPage() {
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }
  const products = await listOrderableProducts();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link href="/admin/orders" className="text-sm text-forest-700 hover:text-forest-800">
        ← Orders
      </Link>
      <h1 className="mb-2 mt-1 font-display text-2xl font-semibold text-forest-900">New order</h1>
      <p className="mb-6 text-sm text-stone">
        For a customer who ordered on WhatsApp or by phone. You will get a payment link to send them; the
        order confirms itself when they pay.
      </p>
      <ManualOrderForm
        products={products}
        stateNames={INDIAN_STATES.map((state) => state.name)}
        defaultState={HOME_STATE}
        freeShippingThresholdPaise={serverConfig.shipping.freeThresholdPaise}
        flatShippingPaise={serverConfig.shipping.flatFeePaise}
      />
    </main>
  );
}
