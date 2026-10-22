/**
 * Google Analytics 4 — measurement ID and typed event helpers.
 *
 * Events are queued on `window.dataLayer`, Google's standard command queue.
 * The queue is inert until gtag.js loads, and gtag.js loads only after the
 * visitor accepts analytics cookies (components/analytics/analytics.tsx) —
 * so tracking calls are always safe, and anything queued earlier in the same
 * visit is delivered the moment consent is given. Page views need no code:
 * GA4's enhanced measurement records App Router navigations from history.
 *
 * Every item is identified by its SKU (`item_id`) on every event, so GA can
 * follow one product from list → page → cart → purchase. Money arrives in
 * paise everywhere in this codebase and is converted to rupees only here.
 */

import { readConsent } from '@/lib/analytics/consent';

/** GA4 property for dronagiriherbal.in, owned by store@dronagiriherbal.in (CLAUDE.md). */
export const GA_MEASUREMENT_ID = 'G-Z0GJEECHZP';

/**
 * Only the production domain reports. Vercel previews and local dev would
 * otherwise pollute real traffic numbers.
 */
const PRODUCTION_HOSTNAME = 'dronagiriherbal.in';

export function isAnalyticsHost(): boolean {
  return window.location.hostname === PRODUCTION_HOSTNAME;
}

declare global {
  interface Window {
    dataLayer?: unknown[];
    /** Google's documented opt-out switch for one GA property. */
    [gaDisable: `ga-disable-${string}`]: boolean | undefined;
  }
}

/**
 * Queue one gtag command. gtag.js only recognises queue entries that are
 * `arguments` objects, not plain arrays — hence the classic function form.
 */
function gtag(..._command: unknown[]): void {
  // eslint-disable-next-line prefer-rest-params
  (window.dataLayer ??= []).push(arguments);
}

let initialised = false;
let disabled = false;

/**
 * Seed the queue with `consent` + `js` + `config` exactly once, ahead of any
 * event, so gtag.js has a destination for everything behind them. Returns
 * false off the production host, and once the visitor has declined — then
 * nothing is queued at all.
 *
 * The consent defaults say what the banner promises: analytics only, never
 * advertising. gtag.js itself is still loaded only after Accept, so these
 * signals describe that choice to Google rather than replace it.
 */
export function prepareAnalytics(): boolean {
  if (!isAnalyticsHost()) return false;
  if (readConsent() === 'denied') return false;
  if (disabled) {
    // Declined earlier in this visit, then accepted from the footer link.
    window[`ga-disable-${GA_MEASUREMENT_ID}`] = false;
    if (initialised) gtag('consent', 'update', { analytics_storage: 'granted' });
    disabled = false;
  }
  if (!initialised) {
    gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied',
    });
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
    initialised = true;
  }
  return true;
}

/**
 * Stop GA immediately when consent is withdrawn mid-visit: Google's opt-out
 * flag halts all sending from the already-loaded gtag.js, and the GA cookies
 * already set are removed rather than left to expire.
 */
export function disableAnalytics(): void {
  window[`ga-disable-${GA_MEASUREMENT_ID}`] = true;
  disabled = true;
  if (initialised) gtag('consent', 'update', { analytics_storage: 'denied' });

  const domain = window.location.hostname;
  for (const cookie of document.cookie.split(';')) {
    const name = cookie.split('=')[0]?.trim();
    if (name && (name === '_ga' || name.startsWith('_ga_'))) {
      // GA sets its cookies on the bare domain; clear both forms to be sure.
      document.cookie = `${name}=; Max-Age=0; path=/; domain=.${domain}`;
      document.cookie = `${name}=; Max-Age=0; path=/`;
    }
  }
}

/** GA4 ecommerce item. Money arrives in paise and is converted at this boundary. */
export interface AnalyticsItem {
  sku: string;
  name: string;
  category: string | null;
  pricePaise: number;
  quantity?: number;
}

/** A named product list — the homepage grid, the shop, a quiz result. */
export interface AnalyticsList {
  id: string;
  name: string;
}

/** Every product list the storefront reports. One place, so names never drift. */
export const PRODUCT_LISTS = {
  homeFeatured: { id: 'home_featured', name: 'Homepage featured' },
  shop: { id: 'shop', name: 'Shop' },
  related: { id: 'related_products', name: 'You might also like' },
  quizResult: { id: 'quiz_result', name: 'Quiz result' },
} as const satisfies Record<string, AnalyticsList>;

function toGaItem(item: AnalyticsItem, index?: number): Record<string, string | number> {
  const gaItem: Record<string, string | number> = {
    item_id: item.sku,
    item_name: item.name,
    price: item.pricePaise / 100,
    quantity: item.quantity ?? 1,
  };
  if (item.category) gaItem.item_category = item.category;
  if (index !== undefined) gaItem.index = index;
  return gaItem;
}

/** Sum of price × quantity, in rupees. */
function valueOf(items: AnalyticsItem[]): number {
  return items.reduce((sum, item) => sum + item.pricePaise * (item.quantity ?? 1), 0) / 100;
}

/** GA4 `view_item` — a shopper opened a product page. */
export function trackViewItem(item: AnalyticsItem): void {
  if (!prepareAnalytics()) return;
  gtag('event', 'view_item', {
    currency: 'INR',
    value: valueOf([item]),
    items: [toGaItem(item)],
  });
}

/** GA4 `view_item_list` — a list of products was shown. Items in display order. */
export function trackViewItemList(list: AnalyticsList, items: AnalyticsItem[]): void {
  if (items.length === 0 || !prepareAnalytics()) return;
  gtag('event', 'view_item_list', {
    item_list_id: list.id,
    item_list_name: list.name,
    items: items.map((item, index) => toGaItem(item, index)),
  });
}

/** GA4 `select_item` — a product was tapped in a list. `index` is its position. */
export function trackSelectItem(list: AnalyticsList, item: AnalyticsItem, index: number): void {
  if (!prepareAnalytics()) return;
  gtag('event', 'select_item', {
    item_list_id: list.id,
    item_list_name: list.name,
    items: [toGaItem(item, index)],
  });
}

/** GA4 `add_to_cart` — `item.quantity` is the units actually added. */
export function trackAddToCart(item: AnalyticsItem): void {
  if (!prepareAnalytics()) return;
  gtag('event', 'add_to_cart', {
    currency: 'INR',
    value: valueOf([item]),
    items: [toGaItem(item)],
  });
}

/** GA4 `remove_from_cart` — `item.quantity` is the units actually removed. */
export function trackRemoveFromCart(item: AnalyticsItem): void {
  if (!prepareAnalytics()) return;
  gtag('event', 'remove_from_cart', {
    currency: 'INR',
    value: valueOf([item]),
    items: [toGaItem(item)],
  });
}

/** GA4 `view_cart` — the shopper opened the cart themselves. */
export function trackViewCart(items: AnalyticsItem[]): void {
  if (!prepareAnalytics()) return;
  gtag('event', 'view_cart', {
    currency: 'INR',
    value: valueOf(items),
    items: items.map((item) => toGaItem(item)),
  });
}

/**
 * GA4 `purchase` — one paid order. For the checkout's confirmation page.
 *
 * `totalPaise` and the items must come from the server's order record, never
 * from the cart in the browser. GA de-duplicates on `transaction_id`, so a
 * refreshed confirmation page does not count the order twice.
 */
export function trackPurchase(order: {
  orderNumber: string;
  totalPaise: number;
  shippingPaise: number;
  items: AnalyticsItem[];
}): void {
  if (!prepareAnalytics()) return;
  gtag('event', 'purchase', {
    transaction_id: order.orderNumber,
    currency: 'INR',
    value: order.totalPaise / 100,
    shipping: order.shippingPaise / 100,
    items: order.items.map((item) => toGaItem(item)),
  });
}

/**
 * GA4 `generate_lead` — a distributor / dealer enquiry was accepted by the
 * server. Only the partner type is sent; nothing the person typed.
 */
export function trackPartnerLead(partnerType: string): void {
  if (!prepareAnalytics()) return;
  gtag('event', 'generate_lead', {
    lead_source: 'partner_enquiry',
    partner_type: partnerType.toLowerCase(),
  });
}

/** `quiz_start` — the first answer of a quiz run (a retake counts again). */
export function trackQuizStart(): void {
  if (!prepareAnalytics()) return;
  gtag('event', 'quiz_start');
}

/**
 * `quiz_complete` — the last answer was given. The answers are the quiz's
 * fixed option codes ("oily-roots", "dullness"…), never free text. Questions
 * the visitor's branch skipped are left out.
 */
export function trackQuizComplete(
  answers: Record<string, string | undefined>,
  recommendationCount: number,
): void {
  if (!prepareAnalytics()) return;
  const params: Record<string, string | number> = { recommendation_count: recommendationCount };
  for (const [question, answer] of Object.entries(answers)) {
    if (answer) params[`quiz_${question.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)}`] = answer;
  }
  gtag('event', 'quiz_complete', params);
}
