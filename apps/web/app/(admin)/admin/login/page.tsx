import type { Metadata } from 'next';

import { AdminLoginForm } from '@/components/admin/admin-login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function AdminLoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="font-display text-2xl font-semibold text-forest-900">Dronagiri Herbal</p>
          <p className="mt-1 text-sm text-stone">Admin sign in</p>
        </div>
        <AdminLoginForm />
      </div>
    </main>
  );
}
