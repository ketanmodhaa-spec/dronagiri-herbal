/**
 * schema.org JSON-LD builders.
 *
 * Pure object builders that compose the structured-data payloads our pages
 * send to Google (Organization, Product, BreadcrumbList). The component
 * that injects them into the DOM lives in `components/seo/json-ld.tsx`.
 */

import { BRAND_EMAIL, BRAND_PHONE, SITE_NAME, SITE_URL, absoluteUrl } from './site';

/**
 * Sitewide Organization graph. Lives on every page so each URL Google
 * crawls re-asserts who publishes the site. Founder, contact, and
 * registered address come from CLAUDE.md.
 */
export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE_URL}/#organization`,
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icon.png'),
    founder: { '@type': 'Person', name: 'Sarita Modha' },
    foundingDate: '2022',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Ahmedabad',
      addressRegion: 'Gujarat',
      addressCountry: 'IN',
    },
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: BRAND_PHONE,
      email: BRAND_EMAIL,
      contactType: 'customer service',
      areaServed: 'IN',
      availableLanguage: ['en', 'gu', 'hi'],
    },
  } as const;
}

/** Inputs for the Product graph — the storefront's view of one product. */
export interface ProductJsonLdInput {
  url: string;
  name: string;
  description: string;
  sku: string;
  category: string;
  imageUrls: string[];
  priceRupees: number;
  inStock: boolean;
  /** ISO 8601 date — set this far enough out to outlive the next price refresh. */
  priceValidUntil: string;
}

/**
 * Product graph used on `/products/[slug]`. The `Offer.availability` enum
 * mirrors `stockQty > 0` — schema.org takes care of the price + currency
 * rendering in Google's Shopping rich results.
 */
export function productJsonLd(input: ProductJsonLdInput) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: input.name,
    description: input.description,
    sku: input.sku,
    category: input.category,
    image: input.imageUrls,
    brand: { '@type': 'Brand', name: SITE_NAME },
    offers: {
      '@type': 'Offer',
      url: input.url,
      priceCurrency: 'INR',
      price: input.priceRupees.toFixed(2),
      priceValidUntil: input.priceValidUntil,
      availability: input.inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
      seller: { '@type': 'Organization', name: SITE_NAME },
    },
  } as const;
}

/** A single hop in a breadcrumb trail. Final hop carries no URL. */
export interface BreadcrumbCrumb {
  name: string;
  url?: string;
}

/**
 * BreadcrumbList — what Google uses to render the "Home > Shop > Product"
 * pattern in search results instead of the bare URL.
 */
export function breadcrumbJsonLd(crumbs: BreadcrumbCrumb[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      ...(crumb.url ? { item: crumb.url } : {}),
    })),
  } as const;
}

/**
 * Serialise a JSON-LD payload safely for a `<script>` tag.
 *
 * Browsers terminate `<script>` at the literal text `</script>` regardless
 * of where it appears — including inside a JSON string. Escaping every `<`
 * to `<` keeps the surrounding `<script>` tag intact even if a product
 * description happens to contain HTML-ish content.
 */
export function serialiseJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
