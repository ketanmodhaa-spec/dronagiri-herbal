# AUDIT.md — Dronagiri Herbal
> Security audit log, code review notes, and compliance checklist.
> Run a full audit before every major milestone.
> Last updated: 25 May 2026

---

## Security Audit — Pre-Launch Checklist

### Payment Security
- [x] Razorpay signature verified with HMAC-SHA256 timing-safe comparison *(13 Oct 2026)*
- [ ] Price fetched server-side — never trusted from client
- [ ] Idempotency key on every payment operation
- [x] Razorpay webhook signature verified before processing *(13 Oct 2026 — over the raw body, before parsing)*
- [x] Double-fulfillment prevented (order status check before fulfillment) *(13 Oct 2026 — order row locked FOR UPDATE; handler and webhook converge on one settlement)*
- [x] Stock decremented ONLY after verified payment *(13 Oct 2026 — online orders; all-or-nothing, products locked in id order)*
- [ ] COD orders stock decremented immediately on placement

### Authentication
- [x] Guest session JWT — HS256, HttpOnly, Secure, SameSite=Lax *(Lax by ruling, 7 Oct 2026: Strict drops the cookie on WhatsApp/Instagram deep links; the guest session is not CSRF-sensitive. Re-evaluate when Phase 4 adds state-changing checkout flows.)*
- [ ] Admin JWT — RS256 asymmetric keys
- [ ] JTI revocation list in Redis (logout invalidates token immediately)
- [ ] Admin token scope limited to /admin path
- [ ] Refresh token only sent to /api/auth/admin/refresh endpoint
- [ ] bcrypt for admin password hashing (cost factor ≥ 12)
- [ ] OTP expires in 10 minutes — max 3 attempts

### API Security
- [ ] Rate limiting on all endpoints (Upstash sliding window)
- [ ] Checkout: 5 requests/minute per IP
- [ ] Payment: 3 requests/5 minutes per IP
- [ ] Admin login: 5 requests/15 minutes per IP
- [ ] Zod validation on every API input — before business logic
- [ ] No sensitive data in error responses
- [ ] No sensitive data in logs (phone, email scrubbed)

### Infrastructure
- [ ] All secrets in environment variables — none hardcoded
- [ ] .env.local in .gitignore
- [ ] Cloudflare R2 — only product images public, no other data
- [ ] Neon — SSL required on all connections
- [ ] Upstash — REST API only (no TCP — edge compatible)
- [ ] Vercel — HTTPS enforced, HTTP → HTTPS redirect

### HTTP Headers
- [ ] Strict-Transport-Security (HSTS) — max-age=63072000
- [ ] X-Frame-Options: SAMEORIGIN
- [ ] X-Content-Type-Options: nosniff
- [ ] Content-Security-Policy — whitelist only known domains
- [ ] Referrer-Policy: strict-origin-when-cross-origin

### WhatsApp Restock
- [ ] Authorised phone allowlist checked before every command
- [ ] Meta WhatsApp webhook signature verified (X-Hub-Signature-256, HMAC-SHA256 with META_APP_SECRET)
- [ ] Meta webhook verify token challenge matched (GET subscription)
- [ ] Message deduplication via Redis (24h TTL)
- [ ] Rate limit: 20 commands/hour per phone
- [ ] Group chat messages silently ignored
- [ ] Quantity cap: max 999 units per restock command
- [ ] Atomic DB transaction — no partial stock updates
- [ ] Stock reconciliation cron catches discrepancies

### Data Privacy
- [ ] Phone numbers hashed (SHA-256 + salt) for analytics
- [ ] Plaintext phone only in order/address tables
- [ ] No personal data in analytics events
- [ ] No personal data in log output
- [ ] Order token hashed in DB — one-way

---

## Audit History

### [19 Oct 2026] — First live payment (admin order + pay link)
Live keys and webhook in prd; prd→Vercel Doppler sync recreated as Config type (the Sensitive one had been disabled).
- [x] Admin-created order DH-26-00001 (₹249, shipping waived) → pay link → real UPI payment `pay_TpfYYLNdiEqMbS`, live mode, captured, ₹0 fee.
- [x] Settled by the **Razorpay webhook** (signed, live) within a minute: CONFIRMED + PAID, one SALE movement (Aloevera Gel 20 → 19, source WEBHOOK).
- [x] Unsigned webhook POST on the live site → 401.
- [x] Refund via Cancel (owner): Razorpay accepted ₹249 at once (rfnd_…), processed ~2½ min later → Refund PROCESSED, order paymentStatus REFUNDED, stock back to 20 (CANCELLATION movement).

### [15 May 2026] — Initial audit checklist created
Status: Not yet run — project not built yet  
Next audit: After Step 1 completion

### [14 Oct 2026] — Consent, loyalty samples and verified reviews
Migration `20261014090000_consent_samples_reviews`. Applied to dev; **production must be migrated before deploy**.
- [x] Marketing consent is false by default. The migration cleared it for every customer with no recorded opt-in, then tested: START → on, with the time and the words "Replied START on WhatsApp"; "stop" → off, with the opt-out time; an ordinary message changes nothing. Signed WhatsApp webhook throughout.
- [x] The WhatsApp send client refuses MARKETING templates unless the customer has consent, and logs `no_consent`. Enforced for every caller.
- [x] Samples: loyal (3+ real orders or ₹1,500+) orders show "🎁 Add sample" in the packing list and on the order. The packer records it once, before shipping; doing it twice or after shipping is refused. Packing without the sample asks for confirmation.
- [x] Reviews only through the HMAC-signed link of a delivered, non-replacement order (ORDER_TOKEN_SECRET; nothing stored). A forged link, an undelivered order, a product not in the order, or a second review of a product → refused. A filled-in honeypot gets a fake success and nothing is stored. Submissions limited to 10 per hour per IP.
- [x] Moderation: PENDING → PUBLISHED, or REJECTED for one of five posting rules. There is no "negative" reason, so it can't be sent. A critical review (≤2★) is flagged, published and answered publicly. AggregateRating JSON-LD is emitted only when real reviews exist.
- [x] Helpful votes: one per guest session per review, enforced by a unique key on a hashed session id, plus 20 per 10 minutes per IP. Tested: same visitor twice → 1; second visitor → 2.

### [13 Oct 2026] — Sales reports verified
`/admin/reports` and `GET /api/admin/reports/export` (Owner only; 401 when signed out, 400 for a bad format or a reversed range).
- [x] Period boundaries are IST midnight. Checked at 01:30 IST, on a Sunday, on 1 Jan and on 31 Mar: weeks run Mon–Sun, the financial year Apr–Mar, and 18:29Z / 18:30Z fall on the correct IST days.
- [x] Figures on the dev test data match the hand calculation: 2 orders ₹598, 1 cancelled, received ₹598, refunded ₹250 (two failed refunds excluded), net ₹348, 1 free replacement. Units come from the ledger.
- [x] Excel: six sheets, amounts are numeric rupees with ₹ format, times shifted to IST, frozen and filterable headers. PDF: summary cards; day rows (empty days omitted) or month rows for periods over 62 days; products; refunds.
- [x] PDF fonts and logo are included in the route's file trace (`outputFileTracingIncludes`), so they ship to Vercel.

### [13 Oct 2026] — Admin orders, refunds and replacements verified (test mode)
Migration `20261013090000_orders_refunds_replacements` adds the Refund table, `Order.attentionReason`, replacement links, `OrderEvent.createdBy`, the order-number counter and a unique `Order.razorpayOrderId`. It is applied to dev only. **Production must be migrated before this code deploys.** Tested through the admin API, logged in as the dev owner, against Razorpay test mode:
- [x] Status steps run in order only: pack → ship (courier + AWB validated) → deliver. Out-of-order steps get a 409 with a plain explanation, and so does a held order until its attention is cleared.
- [x] Cancel works only before dispatch. Stock the order took goes back (CANCELLATION), and a paid online order is refunded in full automatically.
- [x] Refunds: Owner only. The amount is capped at what was paid minus pending and processed refunds; ₹300 on a ₹299 order is refused. A repeated idempotency key returns the same refund, and nothing is paid twice.
- [x] Restock on return is capped at the units this order still has out, read from the ledger. A second restock of the same unit is refused.
- [x] A Razorpay refusal is recorded as FAILED, the order is flagged with a reason, and nothing counts as refunded. An unclear outcome stays PENDING; "Check status" and the `refund.processed` webhook both reconcile it by `notes.refundId`.
- [x] Full refund on a delivered order → REFUND_INITIATED → REFUNDED once processed. A partial refund leaves the status alone.
- [x] Replacement: shipped or delivered orders only, quantity capped at what was ordered. It becomes a ₹0 linked order (DH-26-00001) in "To pack" and takes stock as REPLACEMENT, not SALE.
- [x] Held order (paid, stock short): "confirm" takes the stock all-or-nothing and clears the flag.
- [x] Unpaid online order older than 24h is cancelled automatically when the orders page opens.
- [ ] Visual check of `/admin/orders` on Sarita's phone
- Finding: Razorpay pays refunds from the merchant balance. On a nearly empty test balance, any refund above it was refused with a generic `invalid request sent`. The failure note now explains this.

### [13 Oct 2026] — Razorpay payment layer verified (test mode)
Built: `lib/payments/` (REST client, signatures, payment service), `POST /api/payment/verify`, `POST /api/webhooks/razorpay`. Checked against the real Razorpay test API on the dev database:
- [x] Razorpay order amount comes from `Order.totalPaise`. The browser never sends an amount. A page reload reuses the same Razorpay order.
- [x] Forged checkout signature → 400 INVALID_SIGNATURE, with no Razorpay call made
- [x] Malformed verify body → 400 (Zod)
- [x] Verify rate limit: 3 per 5 min per session+IP → 429
- [x] Bad webhook signature → 401
- [x] Signed `payment.failed` → order stays PENDING, paymentStatus FAILED, OrderEvent written. A later success still wins.
- [x] Duplicate webhook event id → 200 duplicate, not processed twice (Redis claim, released on transient failure so Razorpay retries)
- [x] Settlement re-fetches the payment from Razorpay and checks order id, amount and currency before writing anything. An authorized payment is captured only while the order is still open; otherwise it is left for Razorpay to auto-refund.
- [x] Paid but out of stock, a second payment, or a payment on a closed order → NEEDS_ATTENTION. The money is recorded, no stock is taken, and Sarita is emailed.
- [x] Success path: a real test card payment (`pay_TnIBEqepYOU5iy`) took the order to CONFIRMED + PAID, wrote one SALE movement (50 → 49) and set Customer.lastOrderAt. The first run exposed Prisma's 5 s interactive-transaction timeout against Neon. The settlement rolled back cleanly (nothing half-written) and now runs with a 30 s timeout. It was recovered by replaying the signed `payment.captured` webhook, which is the same path Razorpay retries take in production.
- [x] Idempotency: the same payment replayed under a new event id returns ALREADY_CONFIRMED, with no second stock movement
- [x] Webhook delivery from Razorpay itself *(19 Oct 2026 — live; see below)*

### [22 May 2026] — Admin authentication verified
Phase 1 (admin auth) built and verified — 25/25 checks passed in a scripted
login → refresh → logout → change-password run against the dev database.
- [x] Admin JWT — RS256 asymmetric keys
- [x] bcrypt for admin password hashing (cost factor 12)
- [x] Refresh token rotation on every use
- [x] Refresh theft detection — reuse of a revoked token revokes the whole token family (SESSION_REVOKED)
- [x] Login rate limiting — 5 requests / 15 minutes per IP (429 on the 6th)
- [x] Generic login error — byte-identical 401 for unknown email vs wrong password; bcrypt runs on both paths, so response timing cannot enumerate accounts
- [x] /me returns only id, email, name, role — no passwordHash, no tokens
- [x] Change password requires the current password; revokes all sessions
- [x] HttpOnly cookies, Secure in production; admin cookie scope separate from the customer guest session; refresh cookie path-scoped to /api/admin/auth/refresh
- [x] Admin pages (/admin/*) gated by the Edge middleware; /api/admin/* routes gated by requireAdmin() in each handler
**Fix logged:** the admin RS256 keys are stored base64-encoded in Doppler; the key loader now decodes base64, and also accepts a raw PEM or escaped-newline form.
Next audit: after Phase 2 (catalogue management).

### [25 May 2026] — WhatsApp scaffolding behind feature flag
Stage 1 of WhatsApp Business API integration shipped — every outbound message goes through a feature-gated client, every inbound webhook is signature-verified.
- [x] **Outbound send client.** All sends route through `lib/notifications/whatsapp/client.ts`. When `ENABLE_WHATSAPP !== 'true'`, the client logs intent to `NotificationLog` (status `QUEUED`, error message `WhatsApp disabled — call recorded but not sent`) and skips the network call — the rest of the app keeps working.
- [x] **Phone normalisation.** `to` is reduced to digits and length-checked (10–15 digits) before either the disabled-path log or the live send; an invalid number lands in `NotificationLog` with status `FAILED` and never hits Meta.
- [x] **Retry policy.** Exactly one retry on 5xx with a 500 ms gap; 4xx fails fast (permanent error). Both attempt's last error message is stored on the log row.
- [x] **Typed templates.** All 13 templates in AGENDA carry their parameter shape; `sendWhatsAppTemplate(...)` is generic over that shape so a missing or misspelled param is a compile error.
- [x] **NotificationLog coverage.** Every code path (disabled, invalid phone, send success, send failure) writes exactly one row. `providerMessageId` is set only on success; `sentAt` is set only when the send returned a `wamid`.
- [x] **OTP service.** 6-digit codes generated via `randomInt`, stored as SHA-256 hex in Redis with a 5-minute TTL; never returned by `issueOtp`; only delivered through the WhatsApp template send. Verification uses `timingSafeEqual` on fixed-length hex digests. Single-use: a successful verify deletes the code. Max 5 attempts per code via a Redis `INCR` with the same TTL; on the 5th wrong code the OTP is deleted.
- [x] **OTP issue rate limit.** 3 issues per phone per 10 minutes via `getOtpIssueLimiter()`. Keyed on the normalised phone, not the IP, so a roaming user is not punished.
- [x] **Webhook signature verification.** `verifyWhatsAppSignature(rawBody, header, appSecret)` does HMAC-SHA256 against the *exact* request body (never the re-serialised JSON), regex-guards the hex portion, requires equal lengths before `timingSafeEqual`, and rejects any non-`sha256=` header value.
- [x] **Webhook always live.** GET handshake compares `hub.verify_token` against `WHATSAPP_WEBHOOK_VERIFY_TOKEN` and echoes `hub.challenge` only on match — works even when the outbound flag is off. Meta requires a verified webhook URL before approving template submissions; this code is what unblocks the rest of the WhatsApp work.
- [x] **Webhook never throws.** Processing errors are logged via console (Sentry auto-captures) but the route still returns 200 — Meta retries 4xx/5xx with backoff and the retry storm would be worse than a missed status event.
- [x] **Status updates are write-only against `providerMessageId`.** `updateMany` is used so a status for an unknown message (replay, testing) silently no-ops rather than throwing.

**Doppler variables required for the webhook to verify (do this first):**
- `WHATSAPP_WEBHOOK_VERIFY_TOKEN` — any random string, used as the GET-handshake shared secret
- `META_APP_SECRET` — Meta App Secret, used to HMAC-verify POSTs

**Doppler variables required to flip `ENABLE_WHATSAPP=true`:**
- `META_WHATSAPP_ACCESS_TOKEN` — long-lived system-user token from Meta Business
- `META_WHATSAPP_PHONE_NUMBER_ID` — the WABA phone-number ID Meta issues
- `ENABLE_WHATSAPP` — set to the literal string `true` (anything else keeps the flag off)

Stage 2 — not yet written, parked for after Meta approves templates: RESTOCK / STOCK / ORDERS / HELP command parser (incoming webhook hands text messages to a real handler), order-state-transition notification hooks (call `sendWhatsAppTemplate` from the order machine once checkout exists), marketing broadcast scheduler.

Next audit: after Meta approves templates and `ENABLE_WHATSAPP=true` lands in production.

---

## Code Review Notes

*(Add notes here during development)*

---

## Known Security Decisions (Accepted Risks)

### Meta WhatsApp OTP — delivery dependent on WhatsApp availability
**Risk:** Users without WhatsApp cannot receive OTP. Phone numbers must be registered on WhatsApp for delivery to succeed.  
**Accepted:** Yes (20 May 2026) — WhatsApp penetration in India is ~95%+ for the target demographic. Switched from Firebase Phone Auth (SMS) to Meta WhatsApp BA after eliminating Firebase entirely.  
**Mitigation:** SMS fallback path if Meta WhatsApp delivery fails or times out (provider TBD — MSG91 in parking lot). OTP code verification happens server-side via Meta verification endpoint before any session is created.

### COD — No payment at time of order
**Risk:** Customer can place order with no upfront payment  
**Accepted:** Yes — COD is standard in India. Sarita collects cash on delivery.  
**Mitigation:** Stock is decremented immediately. COD orders tracked separately. Admin alerted to pending COD collections.
