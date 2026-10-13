import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminSignOutButton } from '@/components/admin/admin-sign-out-button';
import { getAdminOrNull } from '@/lib/auth/require-admin';
import { countOrdersForBadges } from '@/lib/orders/admin-order-service';
import { countNewPartnerEnquiries } from '@/lib/partners/partner-enquiry-service';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function AdminDashboardPage() {
  // Middleware already gated this route; re-checking here is defence in depth.
  const admin = await getAdminOrNull();
  if (!admin) {
    redirect('/admin/login');
  }
  const [newEnquiries, orderBadges] = await Promise.all([
    countNewPartnerEnquiries(),
    countOrdersForBadges(),
  ]);

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">Admin</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-forest-900">
            Welcome, {admin.name}
          </h1>
          <p className="mt-1 text-sm text-stone">Signed in as {admin.email}</p>
        </div>
        <AdminSignOutButton />
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
        <Link
          href="/admin/orders"
          className="rounded-2xl border border-forest-100 bg-white p-5 transition-colors hover:border-forest-200 hover:bg-forest-50 sm:col-span-2"
        >
          <p className="flex flex-wrap items-center gap-2 font-display text-lg font-semibold text-forest-900">
            Orders
            {orderBadges.attention > 0 && (
              <span className="rounded-full bg-red-600 px-2 py-0.5 font-body text-xs font-semibold text-white">
                {orderBadges.attention} need attention
              </span>
            )}
            {orderBadges.toPack > 0 && (
              <span className="rounded-full bg-gold px-2 py-0.5 font-body text-xs font-semibold text-forest-900">
                {orderBadges.toPack} to pack
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-stone">Pack, ship, cancel, refund and replace.</p>
        </Link>
        {admin.role === 'OWNER' && (
          <Link
            href="/admin/reports"
            className="rounded-2xl border border-forest-100 bg-white p-5 transition-colors hover:border-forest-200 hover:bg-forest-50 sm:col-span-2"
          >
            <p className="font-display text-lg font-semibold text-forest-900">Reports</p>
            <p className="mt-1 text-sm text-stone">
              Sales, money received and refunds — daily, weekly, monthly. Download as Excel or PDF.
            </p>
          </Link>
        )}
        <Link
          href="/admin/products"
          className="rounded-2xl border border-forest-100 bg-white p-5 transition-colors hover:border-forest-200 hover:bg-forest-50"
        >
          <p className="font-display text-lg font-semibold text-forest-900">Products</p>
          <p className="mt-1 text-sm text-stone">Add and edit the catalogue, prices and stock.</p>
        </Link>
        <Link
          href="/admin/categories"
          className="rounded-2xl border border-forest-100 bg-white p-5 transition-colors hover:border-forest-200 hover:bg-forest-50"
        >
          <p className="font-display text-lg font-semibold text-forest-900">Categories</p>
          <p className="mt-1 text-sm text-stone">Organise the catalogue into categories.</p>
        </Link>
        <Link
          href="/admin/enquiries"
          className="rounded-2xl border border-forest-100 bg-white p-5 transition-colors hover:border-forest-200 hover:bg-forest-50"
        >
          <p className="flex items-center gap-2 font-display text-lg font-semibold text-forest-900">
            Distributor enquiries
            {newEnquiries > 0 && (
              <span className="rounded-full bg-gold px-2 py-0.5 font-body text-xs font-semibold text-forest-900">
                {newEnquiries} new
              </span>
            )}
          </p>
          <p className="mt-1 text-sm text-stone">Distributor, dealer and sales-agent leads to call back.</p>
        </Link>
      </section>

      <Link
        href="/admin/change-password"
        className="mt-6 inline-block text-sm font-medium text-forest-700 underline underline-offset-2 hover:text-forest-800"
      >
        Change your password
      </Link>
    </main>
  );
}
