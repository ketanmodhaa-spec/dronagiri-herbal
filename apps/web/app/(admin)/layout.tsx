import type { Metadata } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: { default: 'Admin', template: '%s · Dronagiri Admin' },
  // The admin area must never reach a search index.
  robots: { index: false, follow: false },
};

/** Chrome for the admin area — deliberately plain, kept apart from the storefront. */
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen bg-forest-50 font-body text-forest-900">{children}</div>;
}
