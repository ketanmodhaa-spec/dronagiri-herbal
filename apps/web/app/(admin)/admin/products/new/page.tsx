import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ProductForm } from '@/components/admin/product-form';
import { listCategoryOptions } from '@/lib/admin/admin-category-service';
import { getAdminOrNull } from '@/lib/auth/require-admin';

export const metadata: Metadata = { title: 'New product' };

export default async function NewProductPage() {
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }
  const categories = await listCategoryOptions();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/admin/products" className="text-sm text-forest-700 hover:text-forest-800">
        ← Products
      </Link>
      <h1 className="mb-6 mt-1 font-display text-2xl font-semibold text-forest-900">New product</h1>

      {categories.length === 0 ? (
        <p className="rounded-2xl border border-forest-100 bg-white p-6 text-sm text-stone">
          Create a category first — every product needs one.{' '}
          <Link href="/admin/categories" className="font-medium text-forest-700 underline">
            Manage categories
          </Link>
        </p>
      ) : (
        <ProductForm mode="create" categories={categories} />
      )}
    </main>
  );
}
