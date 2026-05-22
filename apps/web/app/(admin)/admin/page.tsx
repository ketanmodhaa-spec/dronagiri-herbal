import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminSignOutButton } from '@/components/admin/admin-sign-out-button';
import { getAdminOrNull } from '@/lib/auth/require-admin';

export const metadata: Metadata = { title: 'Dashboard' };

export default async function AdminDashboardPage() {
  // Middleware already gated this route; re-checking here is defence in depth.
  const admin = await getAdminOrNull();
  if (!admin) {
    redirect('/admin/login');
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <header className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Admin</p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-forest-900">
            Welcome, {admin.name}
          </h1>
          <p className="mt-1 text-sm text-stone">Signed in as {admin.email}</p>
        </div>
        <AdminSignOutButton />
      </header>

      <section className="mt-8 grid gap-3 sm:grid-cols-2">
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
