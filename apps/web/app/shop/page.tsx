import type { Metadata } from 'next';

import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Container } from '@/components/ui/container';
import { LeafIcon } from '@/components/ui/icons';
import { ProductCard } from '@/components/ui/product-card';
import { listShopCategoriesWithProducts } from '@/lib/products/product-service';
import { absoluteUrl } from '@/lib/seo/site';

/**
 * Catalogue read live per request so admin additions appear without a
 * redeploy — same pattern as the homepage and the product detail page.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Shop · The Collection',
  description:
    'Every Dronagiri Herbal formulation in one place — handcrafted Ayurvedic hair and skin care, organised by category.',
  alternates: { canonical: absoluteUrl('/shop') },
  openGraph: {
    title: 'The Dronagiri Herbal Collection',
    description:
      'Handcrafted Ayurvedic hair and skin care, organised by category. Made in small batches in Ahmedabad.',
    url: absoluteUrl('/shop'),
  },
};

export default async function ShopPage() {
  const categories = await listShopCategoriesWithProducts();

  // Total count across all categories — drives the empty-state.
  const totalProducts = categories.reduce(
    (sum, category) => sum + category.products.length,
    0,
  );

  return (
    <>
      <SiteHeader />

      <main className="bg-cream pb-20">
        {/* ── Hero band ───────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-white via-forest-50 to-cream">
          <Container className="flex flex-col items-center py-16 text-center md:py-20">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-100 px-4 py-1.5 text-xs font-medium text-forest-800">
              <LeafIcon className="h-3.5 w-3.5 text-forest-700" />
              The Collection
            </span>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.1] sm:text-5xl">
              Every Dronagiri Herbal formulation
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-stone">
              Small-batch Ayurvedic hair and skin care from Sarita Modha&rsquo;s
              workshop in Ahmedabad. Browse below, or take the quiz if you
              want a suggestion to start from.
            </p>
          </Container>
        </section>

        {/* ── Category sections ──────────────────────────────────────── */}
        <Container className="pt-12 md:pt-16">
          {totalProducts === 0 ? (
            <div className="rounded-2xl border border-forest-100 bg-white px-6 py-14 text-center">
              <p className="font-display text-xl font-semibold text-forest-900">
                The shelf is being stocked.
              </p>
              <p className="mt-3 text-stone">
                New products join the collection every few weeks. Message us on
                WhatsApp if you&rsquo;re looking for something specific.
              </p>
            </div>
          ) : (
            <div className="space-y-16">
              {categories.map((category) => (
                <section key={category.id} aria-labelledby={`cat-${category.id}`}>
                  <div className="mb-6 flex items-baseline justify-between gap-4 border-b border-forest-100 pb-3">
                    <h2
                      id={`cat-${category.id}`}
                      className="font-display text-2xl font-semibold text-forest-900 sm:text-3xl"
                    >
                      {category.name}
                    </h2>
                    <p className="text-xs font-medium uppercase tracking-wider text-stone-light">
                      {category.products.length}{' '}
                      {category.products.length === 1 ? 'product' : 'products'}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                    {category.products.map((product) => (
                      <ProductCard key={product.slug} product={product} />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          )}
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}
