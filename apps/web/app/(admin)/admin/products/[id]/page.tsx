import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';

import type { Product } from '@dronagiri/db';

import { ProductForm } from '@/components/admin/product-form';
import { StockEditor } from '@/components/admin/stock-editor';
import { listCategoryOptions } from '@/lib/admin/admin-category-service';
import { getProductForAdmin } from '@/lib/admin/admin-product-service';
import { getAdminOrNull } from '@/lib/auth/require-admin';
import { NotFoundError } from '@/lib/errors';

export const metadata: Metadata = { title: 'Edit product' };

export default async function EditProductPage({ params }: { params: { id: string } }) {
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }

  let product: Product;
  try {
    product = await getProductForAdmin(params.id);
  } catch (error) {
    if (error instanceof NotFoundError) {
      notFound();
    }
    throw error;
  }
  const categories = await listCategoryOptions();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <Link href="/admin/products" className="text-sm text-forest-700 hover:text-forest-800">
        ← Products
      </Link>
      <h1 className="mb-6 mt-1 font-display text-2xl font-semibold text-forest-900">
        {product.name}
      </h1>

      <div className="space-y-8">
        <ProductForm mode="edit" product={product} categories={categories} />
        <StockEditor
          productId={product.id}
          currentStock={product.stockQty}
          lowStockThreshold={product.lowStockThreshold}
        />
      </div>
    </main>
  );
}
