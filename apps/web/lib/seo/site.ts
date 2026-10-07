/**
 * Site-wide SEO constants.
 *
 * Single source of truth for the brand metadata that turns up in JSON-LD,
 * sitemap, robots, OG cards, and canonical URLs. Update here, not in
 * individual pages — the brand string in one place beats the same string
 * sprinkled across ten.
 */

/** Production origin — used as the base for canonical URLs and sitemap entries. */
export const SITE_URL = 'https://dronagiriherbal.in';

/** Brand surface — what shows up in `<title>`, JSON-LD, and OG cards. */
export const SITE_NAME = 'Dronagiri Herbal';
export const SITE_TAGLINE = 'Sanjivani for Hair & Skin Care';
export const SITE_DESCRIPTION =
  'Handcrafted Ayurvedic hair and skin care from Ahmedabad. 100% natural, ' +
  'WHO-GMP certified, KVIC registered. Cash on delivery across India; free shipping above ₹499.';

/**
 * Sitewide share card (app/opengraph-image.png). A page that sets its own
 * `openGraph` replaces the root one wholesale — images included — so such
 * pages must list this explicitly or WhatsApp/Facebook previews go blank.
 */
export const DEFAULT_OG_IMAGE = {
  url: '/opengraph-image.png',
  width: 1200,
  height: 630,
  alt: 'Dronagiri Herbal — Sanjivani for Hair & Skin Care',
} as const;

/** Telephone number in E.164 — schema.org `ContactPoint.telephone` expects this. */
export const BRAND_PHONE = '+919429029840';
export const BRAND_EMAIL = 'store@dronagiriherbal.in';

/** Build a fully-qualified URL from a path. Leading slash is required. */
export function absoluteUrl(path: string): string {
  if (!path.startsWith('/')) {
    throw new Error(`absoluteUrl path must start with /: got "${path}"`);
  }
  return `${SITE_URL}${path}`;
}
