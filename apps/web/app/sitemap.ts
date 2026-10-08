import type { MetadataRoute } from 'next';

import {
  listActiveProductsForSitemap,
  type ProductSitemapEntry,
} from '@/lib/products/product-service';
import { absoluteUrl } from '@/lib/seo/site';

/**
 * Dynamic sitemap.xml.
 *
 * Generated per-request and cached on the Vercel CDN for 24 hours — long
 * enough that traffic is cheap, short enough that a new product or a price
 * change appears to crawlers within a day. Catalogue changes that need
 * immediate indexing can be pushed via Google Search Console's URL Inspector.
 */
export const revalidate = 86400;

/**
 * Static, brand-stable pages and their crawl priorities.
 *
 * `showsCatalogue` pages change whenever a product does, so they take the
 * newest product's `updatedAt` as their lastModified. Every other page omits
 * lastModified: a missing date is neutral to Google, while a date that moves
 * on every crawl teaches it to ignore the field site-wide.
 */
const STATIC_PAGES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
  showsCatalogue?: boolean;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0, showsCatalogue: true },
  { path: '/shop', changeFrequency: 'weekly', priority: 0.9, showsCatalogue: true },
  { path: '/about', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/quiz', changeFrequency: 'monthly', priority: 0.7 },
  { path: '/become-a-distributor', changeFrequency: 'monthly', priority: 0.6 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/refund-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/shipping-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/data-deletion', changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Catalogue rows come from Postgres; Neon's free tier scales to zero, so a
  // first-request cold start can occasionally fail before the compute wakes.
  // Sitemap requests are infrequent and almost always re-tried by crawlers —
  // returning the static half is far better than a 500 that takes the whole
  // file off the air.
  let products: ProductSitemapEntry[] = [];
  try {
    products = await listActiveProductsForSitemap();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('[sitemap] product fetch failed; returning static entries only', error);
  }

  // The service returns newest-first, so the head row dates the catalogue.
  const catalogueUpdatedAt = products[0]?.updatedAt;

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(
    ({ path, changeFrequency, priority, showsCatalogue }) => ({
      url: absoluteUrl(path),
      lastModified: showsCatalogue ? catalogueUpdatedAt : undefined,
      changeFrequency,
      priority,
    }),
  );

  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  return [...staticEntries, ...productEntries];
}
