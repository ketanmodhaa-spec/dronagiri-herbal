import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { CategoryManager } from '@/components/admin/category-manager';
import { listCategoriesForAdmin } from '@/lib/admin/admin-category-service';
import { getAdminOrNull } from '@/lib/auth/require-admin';

export const metadata: Metadata = { title: 'Categories' };

export default async function AdminCategoriesPage() {
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }
  const categories = await listCategoriesForAdmin();

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <Link href="/admin" className="text-sm text-forest-700 hover:text-forest-800">
        ← Dashboard
      </Link>
      <h1 className="mb-1 mt-1 font-display text-2xl font-semibold text-forest-900">Categories</h1>
      <p className="mb-6 text-sm text-stone">
        Every product belongs to a category. A category with products can be hidden, not deleted.
      </p>
      <CategoryManager categories={categories} />
    </main>
  );
}
