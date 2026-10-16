import type { Metadata } from 'next';
import Link from 'next/link';

import { TrackViewItemList } from '@/components/analytics/track-view-item-list';
import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Container } from '@/components/ui/container';
import { LeafIcon } from '@/components/ui/icons';
import { ProductCard } from '@/components/ui/product-card';
import { PRODUCT_LISTS } from '@/lib/analytics/gtag';
import { cardToAnalyticsItem } from '@/lib/analytics/items';
import { cn } from '@/lib/cn';
import {
  listShopCategoriesWithProducts,
  listShopCategoryLinks,
} from '@/lib/products/product-service';
import { DEFAULT_OG_IMAGE, absoluteUrl } from '@/lib/seo/site';

/**
 * Catalogue read live per request so admin additions appear without a
 * redeploy — same pattern as the homepage and the product detail page.
 */
export const dynamic = 'force-dynamic';

interface ShopPageProps {
  /** `?category=<slug>` narrows the page to one category, e.g. skin-care. */
  searchParams: Promise<{ category?: string }>;
}

const ALL_DESCRIPTION =
  'Every Dronagiri Herbal formulation in one place — handcrafted Ayurvedic hair and skin care, organised by category.';

export async function generateMetadata(props: ShopPageProps): Promise<Metadata> {
  const { category: slug } = await props.searchParams;
  const category = slug
    ? (await listShopCategoryLinks()).find((item) => item.slug === slug)
    : undefined;
  // Each category view is its own indexable page; an unknown slug falls back to the full shop.
  const path = category ? `/shop?category=${category.slug}` : '/shop';
  const title = category ? `${category.name} · The Collection` : 'Shop · The Collection';
  const description = category
    ? `Handcrafted Ayurvedic ${category.name.toLowerCase()} from Dronagiri Herbal — made in small batches in Ahmedabad.`
    : ALL_DESCRIPTION;
  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(path) },
    openGraph: {
      title: category ? `${category.name} — Dronagiri Herbal` : 'The Dronagiri Herbal Collection',
      description,
      url: absoluteUrl(path),
      images: [DEFAULT_OG_IMAGE],
    },
  };
}

export default async function ShopPage(props: ShopPageProps) {
  const { category: selectedSlug } = await props.searchParams;
  const categories = await listShopCategoriesWithProducts();
  const selected = categories.find((category) => category.slug === selectedSlug) ?? null;
  const shown = selected ? [selected] : categories;
  const totalCount = categories.reduce((sum, category) => sum + category.products.length, 0);

  // The whole page is one GA list, in reading order; each card's index is
  // its position in that list, counted across category sections.
  const allProducts = shown.flatMap((category) => category.products);
  const listIndex = new Map(allProducts.map((product, index) => [product.slug, index]));

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
              {selected ? selected.name : 'Every Dronagiri Herbal formulation'}
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
          {categories.length > 1 && (
            <nav aria-label="Browse by category" className="-mx-4 mb-10 overflow-x-auto px-4">
              <ul className="flex w-max gap-2">
                {[
                  { slug: null, name: 'All', count: totalCount },
                  ...categories.map((category) => ({
                    slug: category.slug,
                    name: category.name,
                    count: category.products.length,
                  })),
                ].map((tab) => {
                  const active = (selected?.slug ?? null) === tab.slug;
                  return (
                    <li key={tab.slug ?? 'all'}>
                      {/* scroll={false}: switching tabs keeps the reader where they are. */}
                      <Link
                        href={tab.slug ? `/shop?category=${tab.slug}` : '/shop'}
                        scroll={false}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'inline-flex h-10 items-center gap-2 rounded-full px-5 text-sm font-medium transition-colors',
                          active
                            ? 'bg-forest-800 text-white'
                            : 'border border-forest-200 bg-white text-forest-800 hover:bg-forest-50',
                        )}
                      >
                        {tab.name}
                        <span className={active ? 'text-forest-100' : 'text-stone-light'}>
                          {tab.count}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
          )}

          {allProducts.length === 0 ? (
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
              <TrackViewItemList
                list={PRODUCT_LISTS.shop}
                items={allProducts.map(cardToAnalyticsItem)}
              />
              {shown.map((category) => (
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
                      <ProductCard
                        key={product.slug}
                        product={product}
                        listing={{ list: PRODUCT_LISTS.shop, index: listIndex.get(product.slug) ?? 0 }}
                      />
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
