import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { AdminChangePasswordForm } from '@/components/admin/admin-change-password-form';
import { getAdminOrNull } from '@/lib/auth/require-admin';

export const metadata: Metadata = { title: 'Change password' };

export default async function AdminChangePasswordPage() {
  // Middleware already gated this route; re-checking here is defence in depth.
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }

  return (
    <main className="mx-auto max-w-sm px-5 py-12">
      <Link href="/admin" className="text-sm text-forest-700 hover:text-forest-800">
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold text-forest-900">Change password</h1>
      <p className="mt-1 text-sm text-stone">
        Pick a new password. You will be signed out everywhere and asked to sign in again.
      </p>
      <div className="mt-6">
        <AdminChangePasswordForm />
      </div>
    </main>
  );
}
