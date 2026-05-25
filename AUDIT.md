# AUDIT.md — Dronagiri Herbal
> Security audit log, code review notes, and compliance checklist.
> Run a full audit before every major milestone.
> Last updated: 25 May 2026

---

## Security Audit — Pre-Launch Checklist

### Payment Security
- [ ] Razorpay signature verified with HMAC-SHA256 timing-safe comparison
- [ ] Price fetched server-side — never trusted from client
- [ ] Idempotency key on every payment operation
- [ ] Razorpay webhook signature verified before processing
- [ ] Double-fulfillment prevented (order status check before fulfillment)
- [ ] Stock decremented ONLY after verified payment
- [ ] COD orders stock decremented immediately on placement

### Authentication
- [ ] Guest session JWT — HS256, HttpOnly, Secure, SameSite=Strict
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

### [15 May 2026] — Initial audit checklist created
Status: Not yet run — project not built yet  
Next audit: After Step 1 completion

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
- `WHATSAPP_WEBHOOK_APP_SECRET` — Meta App Secret, used to HMAC-verify POSTs

**Doppler variables required to flip `ENABLE_WHATSAPP=true`:**
- `WHATSAPP_ACCESS_TOKEN` — long-lived system-user token from Meta Business
- `WHATSAPP_PHONE_NUMBER_ID` — the WABA phone-number ID Meta issues
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
