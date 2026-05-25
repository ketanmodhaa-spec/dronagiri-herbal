import type { MetadataRoute } from 'next';

import { SITE_URL, absoluteUrl } from '@/lib/seo/site';

/**
 * robots.txt for the storefront.
 *
 * The admin panel, the API surface, and the Sentry tunnel are not parts of
 * the storefront and must not be indexed. Everything else is open — there
 * is no soft-launch gate; missing pages 404 cleanly and a 404 is fine to
 * be crawled.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/admin/', '/api/', '/monitoring'],
      },
    ],
    sitemap: absoluteUrl('/sitemap.xml'),
    host: SITE_URL,
  };
}
