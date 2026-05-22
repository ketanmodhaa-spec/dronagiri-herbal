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

      <section className="mt-8 rounded-2xl border border-forest-100 bg-white p-6">
        <p className="text-sm text-forest-900">
          Admin sign-in is working. Product management arrives in the next phase.
        </p>
        <Link
          href="/admin/change-password"
          className="mt-4 inline-block text-sm font-medium text-forest-700 underline underline-offset-2 hover:text-forest-800"
        >
          Change your password
        </Link>
      </section>
    </main>
  );
}
