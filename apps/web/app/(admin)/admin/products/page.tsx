import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { listProductsForAdmin } from '@/lib/admin/admin-product-service';
import { getAdminOrNull } from '@/lib/auth/require-admin';
import { formatPrice } from '@/lib/format';

export const metadata: Metadata = { title: 'Products' };

export default async function AdminProductsPage() {
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }
  const products = await listProductsForAdmin();

  return (
    <main className="mx-auto max-w-4xl px-5 py-12">
      <header className="flex items-center justify-between gap-4">
        <div>
          <Link href="/admin" className="text-sm text-forest-700 hover:text-forest-800">
            ← Dashboard
          </Link>
          <h1 className="mt-1 font-display text-2xl font-semibold text-forest-900">Products</h1>
        </div>
        <Button href="/admin/products/new" size="sm">
          Add product
        </Button>
      </header>

      {products.length === 0 ? (
        <p className="mt-8 rounded-2xl border border-forest-100 bg-white p-6 text-sm text-stone">
          No products yet — add your first one.
        </p>
      ) : (
        <div className="mt-6 divide-y divide-forest-100 overflow-hidden rounded-2xl border border-forest-100 bg-white">
          {products.map((product) => (
            <Link
              key={product.id}
              href={`/admin/products/${product.id}`}
              className="flex items-center gap-3 p-4 transition-colors hover:bg-forest-50"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-forest-900">{product.name}</p>
                <p className="truncate text-xs text-stone">
                  {product.categoryName} · {product.sku}
                </p>
              </div>
              <span className="hidden w-20 text-right text-sm text-forest-800 sm:block">
                {formatPrice(product.pricePaise)}
              </span>
              <span
                className={
                  product.stockQty <= product.lowStockThreshold
                    ? 'w-16 text-right text-sm font-medium text-amber-700'
                    : 'w-16 text-right text-sm text-stone'
                }
              >
                {product.stockQty} in
              </span>
              <span className="flex w-28 justify-end gap-1">
                {product.isFeatured && (
                  <span className="rounded-full bg-forest-100 px-2 py-0.5 text-xs text-gold">
                    Featured
                  </span>
                )}
                {!product.isActive && (
                  <span className="rounded-full bg-forest-50 px-2 py-0.5 text-xs text-stone">
                    Hidden
                  </span>
                )}
              </span>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
