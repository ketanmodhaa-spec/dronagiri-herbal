import type { MetadataRoute } from 'next';

import { listActiveProductsForSitemap } from '@/lib/products/product-service';
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

/** Static, brand-stable pages and their crawl priorities. */
const STATIC_PAGES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency'];
  priority: number;
}> = [
  { path: '/', changeFrequency: 'weekly', priority: 1.0 },
  { path: '/contact', changeFrequency: 'yearly', priority: 0.4 },
  { path: '/terms', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/refund-policy', changeFrequency: 'yearly', priority: 0.3 },
  { path: '/shipping-policy', changeFrequency: 'yearly', priority: 0.3 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listActiveProductsForSitemap();
  const now = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(
    ({ path, changeFrequency, priority }) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );

  // Product pages come next — higher priority than legal pages, lower than
  // the homepage. The catalogue is what we want indexed first.
  const productEntries: MetadataRoute.Sitemap = products.map((product) => ({
    url: absoluteUrl(`/products/${product.slug}`),
    lastModified: product.updatedAt,
    changeFrequency: 'weekly',
    priority: 0.9,
  }));

  return [...staticEntries, ...productEntries];
}
