# AUDIT.md — Dronagiri Herbal
> Security audit log, code review notes, and compliance checklist.
> Run a full audit before every major milestone.
> Last updated: 20 May 2026

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
