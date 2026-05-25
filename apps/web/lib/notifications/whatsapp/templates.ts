/**
 * WhatsApp template registry.
 *
 * Every outbound WhatsApp message Dronagiri Herbal sends goes through a
 * pre-approved Meta template — the platform forbids free-form messages
 * outside a 24-hour customer-initiated window. This file is the single
 * source of truth for the templates we submit to Meta and call from code.
 *
 * Each template declares its own parameter shape. The send client is
 * generic over that shape, so an OTP send with `{ orderNumber: '...' }`
 * is a compile-time error, not a runtime mystery.
 *
 * **Meta categories** drive billing and per-template rules:
 *   - `AUTHENTICATION` — OTPs only. Highest priority, lowest cost.
 *   - `UTILITY` — transactional (orders, refunds). Linked to a real event.
 *   - `MARKETING` — promotional, requires customer marketing-consent flag.
 *
 * **Language code**: Meta uses BCP-47-ish identifiers (`en`, `en_US`, `gu`,
 * `hi`). We standardise on `en` here because Meta's WhatsApp Manager UI
 * shows plain "English" as the default for AUTH templates; picking that
 * gives the language code `en`, and code + Meta have to match exactly or
 * the send is rejected with "template not found". When we submit Gujarati
 * or Hindi variants later we add separate template entries with `gu` /
 * `hi` rather than swapping the language in place.
 */

/** Meta parameter primitive — typed as text by default; media types come later. */
export interface WhatsAppBodyParameter {
  type: 'text';
  text: string;
}

/** Templates fall into one of Meta's three categories — drives billing + rules. */
export type WhatsAppTemplateCategory = 'AUTHENTICATION' | 'UTILITY' | 'MARKETING';

/**
 * One template, with the parameter shape callers must pass and a `build`
 * function that maps that shape onto Meta's positional parameter array.
 * `build` exists so the order of `{{1}}`, `{{2}}` in Meta's template body
 * is encoded once, not duplicated at every call site.
 */
export interface WhatsAppTemplate<P extends Record<string, string>> {
  name: string;
  category: WhatsAppTemplateCategory;
  language: string;
  build: (params: P) => WhatsAppBodyParameter[];
}

/** Helper that preserves the generic parameter shape through inference. */
function defineTemplate<P extends Record<string, string>>(
  t: WhatsAppTemplate<P>,
): WhatsAppTemplate<P> {
  return t;
}

/* ─── Authentication ──────────────────────────────────────────────────── */

/** 6-digit OTP for checkout phone verification. The only AUTH template we use. */
export const otpLoginTemplate = defineTemplate<{ code: string }>({
  name: 'otp_login',
  category: 'AUTHENTICATION',
  language: 'en',
  build: (p) => [{ type: 'text', text: p.code }],
});

/* ─── Order lifecycle (UTILITY) ───────────────────────────────────────── */

/** Sent immediately after an order is placed, before COD confirmation. */
export const orderPlacedTemplate = defineTemplate<{
  customerFirstName: string;
  orderNumber: string;
  totalRupees: string;
  trackingUrl: string;
}>({
  name: 'order_placed',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.customerFirstName },
    { type: 'text', text: p.orderNumber },
    { type: 'text', text: p.totalRupees },
    { type: 'text', text: p.trackingUrl },
  ],
});

/** Sent after Sarita confirms a COD order (or an online order is paid). */
export const orderConfirmedTemplate = defineTemplate<{
  customerFirstName: string;
  orderNumber: string;
  expectedDispatch: string;
}>({
  name: 'order_confirmed',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.customerFirstName },
    { type: 'text', text: p.orderNumber },
    { type: 'text', text: p.expectedDispatch },
  ],
});

/** Sent when the order is packed and ready for the courier. */
export const orderPackedTemplate = defineTemplate<{
  customerFirstName: string;
  orderNumber: string;
}>({
  name: 'order_packed',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.customerFirstName },
    { type: 'text', text: p.orderNumber },
  ],
});

/** Sent when the courier picks up; carries the AWB / tracking link. */
export const orderShippedTemplate = defineTemplate<{
  customerFirstName: string;
  orderNumber: string;
  courier: string;
  trackingNumber: string;
  trackingUrl: string;
}>({
  name: 'order_shipped',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.customerFirstName },
    { type: 'text', text: p.orderNumber },
    { type: 'text', text: p.courier },
    { type: 'text', text: p.trackingNumber },
    { type: 'text', text: p.trackingUrl },
  ],
});

/** Sent on delivery — prompts a review request later. */
export const orderDeliveredTemplate = defineTemplate<{
  customerFirstName: string;
  orderNumber: string;
}>({
  name: 'order_delivered',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.customerFirstName },
    { type: 'text', text: p.orderNumber },
  ],
});

/** Sent when an order is cancelled — by Sarita or by the customer. */
export const orderCancelledTemplate = defineTemplate<{
  customerFirstName: string;
  orderNumber: string;
  reason: string;
}>({
  name: 'order_cancelled',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.customerFirstName },
    { type: 'text', text: p.orderNumber },
    { type: 'text', text: p.reason },
  ],
});

/* ─── Refunds (UTILITY) ───────────────────────────────────────────────── */

/** Sent when Sarita starts a refund — Razorpay webhook will confirm later. */
export const refundInitiatedTemplate = defineTemplate<{
  customerFirstName: string;
  orderNumber: string;
  amountRupees: string;
}>({
  name: 'refund_initiated',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.customerFirstName },
    { type: 'text', text: p.orderNumber },
    { type: 'text', text: p.amountRupees },
  ],
});

/** Sent when Razorpay confirms the refund landed in the customer's account. */
export const refundCompletedTemplate = defineTemplate<{
  customerFirstName: string;
  orderNumber: string;
  amountRupees: string;
}>({
  name: 'refund_completed',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.customerFirstName },
    { type: 'text', text: p.orderNumber },
    { type: 'text', text: p.amountRupees },
  ],
});

/* ─── Admin alerts (UTILITY, recipient is Sarita) ─────────────────────── */

/** Daily stock alert sent to Sarita's phone — listing low-stock SKUs. */
export const restockAlertTemplate = defineTemplate<{
  productName: string;
  currentStock: string;
  sku: string;
}>({
  name: 'restock_alert',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.productName },
    { type: 'text', text: p.currentStock },
    { type: 'text', text: p.sku },
  ],
});

/** End-of-day summary to Sarita — orders, revenue, top product. */
export const dailySummaryTemplate = defineTemplate<{
  ordersCount: string;
  revenueRupees: string;
  topProduct: string;
}>({
  name: 'daily_summary',
  category: 'UTILITY',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.ordersCount },
    { type: 'text', text: p.revenueRupees },
    { type: 'text', text: p.topProduct },
  ],
});

/* ─── Marketing (requires marketingConsent on the Customer) ───────────── */

/** Repeat-order nudge — sent N days after the typical re-purchase interval. */
export const repurchaseNudgeTemplate = defineTemplate<{
  customerFirstName: string;
  productName: string;
}>({
  name: 'repurchase_nudge',
  category: 'MARKETING',
  language: 'en',
  build: (p) => [
    { type: 'text', text: p.customerFirstName },
    { type: 'text', text: p.productName },
  ],
});

/** Win-back nudge for lapsed customers — long-gap since last order. */
export const winbackNudgeTemplate = defineTemplate<{
  customerFirstName: string;
}>({
  name: 'winback_nudge',
  category: 'MARKETING',
  language: 'en',
  build: (p) => [{ type: 'text', text: p.customerFirstName }],
});

/**
 * Aggregate registry — useful for the future admin "Templates" dashboard
 * that lets Sarita see submission/approval state for each template.
 * Strings are loose here on purpose; per-template typing happens at call
 * sites via the individual exports above.
 */
export const allTemplates = [
  otpLoginTemplate,
  orderPlacedTemplate,
  orderConfirmedTemplate,
  orderPackedTemplate,
  orderShippedTemplate,
  orderDeliveredTemplate,
  orderCancelledTemplate,
  refundInitiatedTemplate,
  refundCompletedTemplate,
  restockAlertTemplate,
  dailySummaryTemplate,
  repurchaseNudgeTemplate,
  winbackNudgeTemplate,
] as const;
