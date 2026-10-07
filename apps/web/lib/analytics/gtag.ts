/**
 * Google Analytics 4 — measurement ID and typed event helpers.
 *
 * Events are queued on `window.dataLayer`, Google's standard command queue.
 * The queue is inert until gtag.js loads, and gtag.js loads only after the
 * visitor accepts analytics cookies (components/analytics/analytics.tsx) —
 * so tracking calls are always safe, and anything queued earlier in the same
 * visit is delivered the moment consent is given. Page views need no code:
 * GA4's enhanced measurement records App Router navigations from history.
 */

/** Existing GA4 property for dronagiriherbal.in — never recreate (CLAUDE.md). */
export const GA_MEASUREMENT_ID = 'G-W8GDHYY8RT';

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

/**
 * Seed the queue with `js` + `config` exactly once, ahead of any event, so
 * gtag.js has a destination for everything behind them. Returns false off
 * the production host, where nothing should be queued and gtag.js must not
 * load at all.
 */
export function prepareAnalytics(): boolean {
  if (!isAnalyticsHost()) return false;
  if (!initialised) {
    gtag('js', new Date());
    gtag('config', GA_MEASUREMENT_ID);
    initialised = true;
  }
  return true;
}

/** GA4 ecommerce item. Money arrives in paise and is converted at this boundary. */
export interface AnalyticsItem {
  sku: string;
  name: string;
  category: string;
  pricePaise: number;
  quantity?: number;
}

function toGaItem(item: AnalyticsItem): Record<string, string | number> {
  return {
    item_id: item.sku,
    item_name: item.name,
    item_category: item.category,
    price: item.pricePaise / 100,
    quantity: item.quantity ?? 1,
  };
}

/** GA4 `view_item` — a shopper opened a product page. */
export function trackViewItem(item: AnalyticsItem): void {
  if (!prepareAnalytics()) return;
  gtag('event', 'view_item', {
    currency: 'INR',
    value: item.pricePaise / 100,
    items: [toGaItem(item)],
  });
}
