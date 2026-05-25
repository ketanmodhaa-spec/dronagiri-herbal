import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import ReactMarkdown from 'react-markdown';

import { JsonLd } from '@/components/seo/json-ld';
import { ProductImageZoom } from '@/components/shop/product-image-zoom';
import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ProductCard } from '@/components/ui/product-card';
import { TrustBadge } from '@/components/ui/trust-badge';
import { formatPrice } from '@/lib/format';
import { getProductBySlug, getRelatedProducts } from '@/lib/products/product-service';
import { breadcrumbJsonLd, productJsonLd } from '@/lib/seo/json-ld';
import { SITE_URL, absoluteUrl } from '@/lib/seo/site';

/**
 * Render per request: catalogue changes from the admin panel appear without
 * a redeploy, and the build never queries the DB (matches the homepage).
 */
export const dynamic = 'force-dynamic';

interface ProductPageProps {
  params: { slug: string };
}

/**
 * Cache the product fetch within one request. Next calls `generateMetadata`
 * and the page component separately; without this wrapper we'd query Prisma
 * twice for every render. `cache()` is per-request, not per-process.
 */
const fetchProduct = cache(getProductBySlug);

/** SEO + social-share metadata. Inactive products fall back to a generic title. */
export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const product = await fetchProduct(params.slug);
  if (!product) {
    return { title: 'Product not found', robots: { index: false, follow: true } };
  }

  // Description must fit a tweet-card preview — strip markdown to its first sentence.
  const blurb = (product.tagline ?? product.description)
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 160);

  const canonical = absoluteUrl(`/products/${product.slug}`);
  const ogImage = product.images[0]?.url;

  return {
    title: product.name,
    description: blurb,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description: blurb,
      url: canonical,
      images: ogImage ? [{ url: ogImage }] : undefined,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: blurb,
      images: ogImage ? [ogImage] : undefined,
    },
  };
}

/** Brand-consistent renderer for the four admin-entered long-form fields. */
function MarkdownProse({ children }: { children: string }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ node: _node, ...props }) => (
          <p className="mt-3 leading-relaxed text-stone" {...props} />
        ),
        ul: ({ node: _node, ...props }) => (
          <ul
            className="mt-3 ml-5 list-disc space-y-1.5 leading-relaxed text-stone"
            {...props}
          />
        ),
        ol: ({ node: _node, ...props }) => (
          <ol
            className="mt-3 ml-5 list-decimal space-y-1.5 leading-relaxed text-stone"
            {...props}
          />
        ),
        li: ({ node: _node, ...props }) => <li {...props} />,
        strong: ({ node: _node, ...props }) => (
          <strong className="font-semibold text-forest-900" {...props} />
        ),
        em: ({ node: _node, ...props }) => <em {...props} />,
        a: ({ node: _node, ...props }) => (
          <a
            className="text-forest-700 underline underline-offset-2 hover:text-forest-800"
            {...props}
          />
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

/**
 * Stock badge — three states driven by `stockQty` against `lowStockThreshold`.
 * Out-of-stock is the only state that gates the (future) add-to-cart action.
 */
function StockBadge({ stockQty, lowStockThreshold }: { stockQty: number; lowStockThreshold: number }) {
  if (stockQty === 0) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-red-600" />
        Out of stock
      </span>
    );
  }
  if (stockQty <= lowStockThreshold) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800">
        <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-amber-600" />
        Only {stockQty} left
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-forest-100 px-3 py-1 text-xs font-medium text-forest-800">
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-forest-600" />
      In stock
    </span>
  );
}

const TRUST_ITEMS = ['WHO GMP Certified', '100% Ayurvedic', 'Cash on Delivery'] as const;

export default async function ProductPage({ params }: ProductPageProps) {
  const product = await fetchProduct(params.slug);
  if (!product) notFound();

  // Related-products query runs in parallel with the rest of the render —
  // it's a separate Prisma round-trip but cheap (single category, take 4).
  const relatedProducts = await getRelatedProducts(product.id, product.categoryId, 4);

  const primaryImage = product.images[0];
  const onSale =
    product.comparePaise !== null && product.comparePaise > product.pricePaise;
  const canonical = absoluteUrl(`/products/${product.slug}`);

  // The shorter blurb used in OG/Twitter is also the cleanest text for the
  // Product JSON-LD description — markdown-stripped, single-sentence.
  const seoDescription = (product.tagline ?? product.description)
    .replace(/[#*_>`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 250);

  // Price-valid-until needs an explicit date; end-of-next-year keeps it
  // valid through long crawl cycles without lying about price stability.
  const priceValidUntil = new Date(new Date().getFullYear() + 1, 11, 31)
    .toISOString()
    .slice(0, 10);

  const productLd = productJsonLd({
    url: canonical,
    name: product.name,
    description: seoDescription,
    sku: product.sku,
    category: product.categoryName,
    imageUrls: product.images.map((image) => image.url),
    priceRupees: product.pricePaise / 100,
    inStock: product.stockQty > 0,
    priceValidUntil,
  });

  const breadcrumbLd = breadcrumbJsonLd([
    { name: 'Home', url: SITE_URL },
    { name: 'Shop', url: `${SITE_URL}/shop` },
    { name: product.name },
  ]);

  return (
    <>
      <JsonLd data={productLd} />
      <JsonLd data={breadcrumbLd} />
      <SiteHeader />

      <main className="bg-cream pb-20 pt-10 md:pt-12">
        <Container>
          {/* Crumb trail back to the catalogue */}
          <p className="text-sm text-stone">
            <Link href="/" className="hover:text-forest-800">
              Home
            </Link>
            <span className="mx-2 text-stone-light">/</span>
            <Link href="/shop" className="hover:text-forest-800">
              Shop
            </Link>
            <span className="mx-2 text-stone-light">/</span>
            <span className="text-forest-900">{product.name}</span>
          </p>

          {/* ── Top half — image + primary info ───────────────────────────── */}
          <div className="mt-6 grid gap-10 md:grid-cols-2 md:gap-14">
            {/* Image well — click-to-zoom lightbox for label inspection */}
            <ProductImageZoom image={primaryImage ?? null} productName={product.name} />

            {/* Primary info */}
            <div className="flex flex-col">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                {product.categoryName}
              </p>
              <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-forest-900 sm:text-4xl">
                {product.name}
              </h1>
              {product.nameGu && (
                <p className="mt-1 font-display text-lg text-stone">{product.nameGu}</p>
              )}
              {product.tagline && (
                <p className="mt-4 text-base italic leading-relaxed text-stone">
                  {product.tagline}
                </p>
              )}

              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-3xl font-semibold text-forest-900">
                  {formatPrice(product.pricePaise)}
                </span>
                {onSale && product.comparePaise !== null && (
                  <span className="text-lg text-stone-light line-through">
                    {formatPrice(product.comparePaise)}
                  </span>
                )}
                {product.sizeLabel && (
                  <span className="ml-1 text-sm text-stone">· {product.sizeLabel}</span>
                )}
              </div>

              <div className="mt-4">
                <StockBadge
                  stockQty={product.stockQty}
                  lowStockThreshold={product.lowStockThreshold}
                />
              </div>

              {/* Add-to-cart — disabled until checkout ships. Honest copy beats a teaser. */}
              <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Button size="lg" disabled>
                  Add to cart
                </Button>
                <span className="text-sm text-stone">
                  Online ordering opens soon. To buy now, message{' '}
                  <a
                    className="font-medium text-forest-700 underline underline-offset-2 hover:text-forest-800"
                    href="https://wa.me/919429029840"
                  >
                    +91 94290 29840
                  </a>{' '}
                  on WhatsApp.
                </span>
              </div>

              <div className="mt-8 flex flex-wrap gap-2.5">
                {TRUST_ITEMS.map((item) => (
                  <TrustBadge key={item}>{item}</TrustBadge>
                ))}
              </div>
            </div>
          </div>

          {/* ── Long-form sections ────────────────────────────────────────── */}
          <div className="mt-16 grid gap-10 md:grid-cols-2 md:gap-14">
            <section>
              <h2 className="font-display text-xl font-semibold text-forest-900">
                About this product
              </h2>
              <MarkdownProse>{product.description}</MarkdownProse>
            </section>

            {product.benefits && (
              <section>
                <h2 className="font-display text-xl font-semibold text-forest-900">
                  Benefits
                </h2>
                <MarkdownProse>{product.benefits}</MarkdownProse>
              </section>
            )}

            {product.ingredients && (
              <section>
                <h2 className="font-display text-xl font-semibold text-forest-900">
                  Ingredients
                </h2>
                <MarkdownProse>{product.ingredients}</MarkdownProse>
              </section>
            )}

            {product.howToUse && (
              <section>
                <h2 className="font-display text-xl font-semibold text-forest-900">
                  How to use
                </h2>
                <MarkdownProse>{product.howToUse}</MarkdownProse>
              </section>
            )}
          </div>

          {/* ── Related products ──────────────────────────────────────────── */}
          {relatedProducts.length > 0 && (
            <section className="mt-20" aria-labelledby="related-heading">
              <div className="flex flex-col items-center text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                  Also from our {product.categoryName.toLowerCase()} shelf
                </p>
                <h2
                  id="related-heading"
                  className="mt-2 font-display text-2xl font-semibold text-forest-900 sm:text-3xl"
                >
                  You might also like
                </h2>
              </div>

              <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                {relatedProducts.map((related) => (
                  <ProductCard key={related.slug} product={related} />
                ))}
              </div>
            </section>
          )}
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}
