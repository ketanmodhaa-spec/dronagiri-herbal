# AGENDA.md — Dronagiri Herbal
> Current tasks, sprint, and priorities.
> Update this file at the start and end of every work session.
> Last updated: 25 May 2026

---

## Next session — 15 Oct 2026

**Razorpay go-live (KYC expected done):**
- [ ] Live keys into Doppler `prd`: `RAZORPAY_KEY_ID` (rzp_live_…) + `RAZORPAY_KEY_SECRET`. Generate `RAZORPAY_WEBHOOK_SECRET`.
- [ ] Register the webhook in the Razorpay **live** dashboard: `https://dronagiriherbal.in/api/webhooks/razorpay`. Events: payment.authorized, payment.captured, order.paid, payment.failed, refund.processed, refund.failed.
- [ ] Verify with the read-only API check (no money moves). Keep test keys in `dev`.
- [ ] Ask the Razorpay dashboard to enable auto-capture. The code captures anyway, but auto-capture is the safety net.

**WhatsApp templates (account 1346230040712730):**
- [x] 10 approved 14 Oct: otp_login, order_placed/confirmed/packed/shipped/delivered/cancelled, refund_initiated, repurchase_nudge, winback_nudge.
- [ ] Fix the typo in `order_cancelled`: "Hir {{1}}" → "Hi {{1}}" (edit in WhatsApp Manager).
- [ ] Submit the rest: `refund_completed`, `restock_alert`, `daily_summary`, `order_invoice` (document header; sample = `sample-invoice-for-meta.pdf`).

**Code — the checkout build (the last big piece, now unblocked):**
- [ ] Checkout: address form, WhatsApp OTP, Terms + marketing-consent checkboxes, order placement, Razorpay pay step (button already built).
- [ ] `otp_login` has a Copy-code **URL button**: the send must also fill the button parameter with the code, or Meta rejects it. Fix with a live OTP test.
- [ ] Connect every status button and the payment/refund webhooks to their WhatsApp template (sent in the background, never blocking).
- [ ] Order tracking page `/track/<signed token>`, with an HMAC link like the review link (the stored-hash design can't rebuild a link at ship time).
- [ ] Point Doppler `dev` at the test WhatsApp account (1534533821662577), so laptop testing can't message real customers.

---

## Today — 15 May 2026

### In progress right now
- [x] Create repo on D: drive — done 20 May 2026
- [x] Install Node.js and Git (verify versions) — done 20 May 2026
- [x] Initialize monorepo structure (pnpm + Turborepo + Next.js 14 + Tailwind + Prisma) — done 20 May 2026
- [x] Push to GitHub — done 20 May 2026
- [x] Connect GitHub to Vercel — done 20 May 2026 (live at dronagiriherbal.in with SSL)
- [x] Doppler setup (workplace + dev config linked to repo) — done 20 May 2026
- [x] Neon agent skill + MCP for Claude — done 20 May 2026

### Blocked
- ⏳ Razorpay KYC — Sarita to complete independently.
- ⏳ Meta WhatsApp templates — 13 templates pending Meta approval (24–48h each). **Scaffolding shipped 25 May; webhook URL `/api/webhooks/whatsapp` is live and ready for Meta to verify. Setting the two webhook Doppler vars and pasting the URL into Meta Business Manager unblocks template submission today.**

### Completed today
- ✅ Neon PostgreSQL — both URLs in .env
- ✅ Upstash Redis — REST URL + token in .env
- ✅ Cloudflare R2 — bucket + API token in .env
- ~~✅ Firebase project created — web app registered — Phone Auth enabled~~ (dropped 20 May — Firebase no longer used)
- ~~✅ Firebase public config in .env~~ (dropped 20 May)
- ✅ All project MD files created (CLAUDE, MEMORY, AGENDA, DISCUSSION, AUDIT, DISPUTE)

---

## This Week (15–21 May 2026)

### Step 1 — Foundation

**Developer tasks:**
- [ ] Monorepo scaffold (turbo + Next.js + Expo)
- [x] Prisma schema push to Neon — `dev` (`br-long-pine`) + `production` (`br-sweet-wildflower`) branches both migrated — done 21 May 2026
- [ ] Seed database (24 products + aliases) — seeded + verified on dev branch 21 May 2026 (do NOT seed prod — placeholder data)
- [x] Design system — CSS tokens, fonts, base UI components + homepage — done 21 May 2026
- [ ] Guest session middleware (JWT + rate limiting)
- [x] Security headers (next.config.mjs) — done 7 Oct 2026
- [ ] Admin auth (bcrypt + RS256 JWT)

**Sarita tasks:**
- [ ] Product photography (2-3 shots per product, natural light)
- [ ] WhatsApp Meta template texts review (Jaydeep submits to Meta Business Manager)
- [ ] Razorpay KYC completion
- [ ] Confirm real prices for all 20 products (currently all ₹299 — placeholder)

**Pending services:**
- [ ] Meta WhatsApp Business API — register WhatsApp number, get app + access token, submit templates
- [x] Resend — signup + domain verify (dronagiriherbal.in) — done 20 May 2026
- [ ] Anthropic — get API key + set spend limit
- [ ] Sentry — setup project

**Domain:**
- [x] Add dronagiriherbal.in to Cloudflare (zone created 20 May 2026)
- [x] Update nameservers at GoDaddy → Cloudflare's
- [x] Add DNS records (A / CNAME) pointing dronagiriherbal.in → Vercel
- [x] Attach dronagiriherbal.in as custom domain in Vercel project (SSL auto-issued)
- [ ] Decide fate of dronagiriherbal.com (kill / 301 to .in / keep as old.*) — tracked in DISPUTE.md

---

## Next Week (22–28 May 2026)

### Step 2 — Store & Checkout

- [ ] Product catalog pages (ISR)
- [ ] Product detail page (gallery, accordions, Gujarati toggle)
- [ ] Cart system (Redis-backed, server-side prices)
- [ ] Checkout flow (address form + payment selector)
- [x] Razorpay integration (test mode first) — payment layer done 13 Oct 2026; checkout UI still gated on OTP
- [x] Payment verification (HMAC-SHA256) — 13 Oct 2026
- [ ] Order confirmation + tracking page
- [ ] WhatsApp notifications (Meta Business API templates)
- [x] Admin panel — orders management — done 13 Oct 2026 (list + detail, status steps, cancel, partial refunds, replacements). Still to add: packing slip, customer notifications on each step
- [ ] Hair & skin quiz

---

## Legal Pages — added 22 May 2026

### High priority — gates Razorpay KYC
- [x] Sarita confirms the ~15 [CONFIRM] items in the legal docs — done 23 May 2026 (7-day refund window, return-shipping rules, 2–4 day dispatch, 5–10 day delivery, courier partners, COD across India + no fee, ₹499 free-ship threshold + ₹49 flat, business hours Mon–Sat 10 AM – 6 PM IST, registered office Ahmedabad)
- [x] Lawyer / CA reviews all 5 legal documents — done 23 May 2026
- [x] Build 5 legal routes in apps/web (content as markdown/MDX): /terms /privacy /refund-policy /shipping-policy /contact — done 23 May 2026
- [x] Wire the footer links (currently dead) to these routes — done 23 May 2026
- [ ] Confirm refund-policy, shipping-policy and terms are live & public BEFORE submitting Razorpay KYC

### Checkout consent capture — when building checkout
- [ ] Required checkbox: agree to Terms + Privacy → store on the Order with a timestamp
- [ ] Optional checkbox: WhatsApp marketing consent → call `recordMarketingConsentInTx` (lib/customers/consent-service.ts) with the checkbox wording `MARKETING_CONSENT_TEXT`. Groundwork done 14 Oct 2026: consent is off by default, the time and wording are stored, STOP/START on WhatsApp is handled, and marketing templates are blocked without consent.

---

## Site Audit Follow-ups — 7 Oct 2026

Fixed in code (audit of dronagiriherbal.in): shipping claim now says "free shipping above ₹499" to match the policy; GA4 (G-W8GDHYY8RT) behind a cookie-consent banner; favicon + Apple icon; site-wide share image; security headers; permanent redirects for /privacy-policy, /refund, /returns, /shipping, /terms-and-conditions, /contact-us, /about-us, /products; gold label text darkened for contrast; sitemap no longer stamps every page with today's date.

Still open:
- [ ] **Shipping decision (Sarita)** — keep ₹49 under ₹499, or make all shipping free? If free, update `content/legal/shipping-policy.md`, `SITE_DESCRIPTION` in `apps/web/lib/seo/site.ts` and the homepage trust badge together.
- [ ] **www redirect → 308** — Vercel → Settings → Domains → www.dronagiriherbal.in → Edit → redirect to dronagiriherbal.in with **308 Permanent**. Currently 307 (dashboard setting, not code).
- [ ] **Admin two-factor login** — login is already rate-limited (5 attempts / 15 min / IP); no second factor yet. Decide TOTP (authenticator app) vs WhatsApp OTP once Meta is approved.
- [x] **GA4 shopping funnel** — done 15 Oct 2026. Every item is identified by SKU. Events: `view_item_list` / `select_item` (lists: homepage featured, shop, related products, quiz result), `view_item`, `add_to_cart` / `remove_from_cart` (sent as the difference the server confirmed), `view_cart` (only when the shopper opens the cart), `generate_lead` (partner enquiry accepted; partner type only), `quiz_start` / `quiz_complete` (answer codes only). Consent signals deny all advertising storage; Decline after Accept stops GA at once and clears the `_ga` cookies. Cart events go live with `NEXT_PUBLIC_ENABLE_CART`.
- [ ] **GA4 purchase tracking** — `trackPurchase` is ready in `lib/analytics/gtag.ts`. Call it from the order confirmation page when checkout ships, with the totals from the server's order (never the browser cart) and the order number as `transaction_id`. Add `begin_checkout` at the same time.
- [ ] **Meta Pixel** — needs a Pixel ID and a privacy-policy line naming Meta before it goes in; reuse the existing consent banner.
- [ ] **GA4 admin (Jaydeep, ~10 min)** — Admin → Events: mark `generate_lead` as a key event now, and `purchase` once it first arrives. Admin → Custom definitions → create event-scoped dimensions `partner_type`, `quiz_primary_focus`, `quiz_hair_type`, `quiz_hair_concern`, `quiz_skin_type`, `quiz_skin_concern`, `quiz_routine`. Admin → Product links → link Search Console. After deploy, check the events in Admin → DebugView or Reports → Realtime.

---

## June 2026

### Step 3 — Intelligence & AI

- [x] Loyalty and reviews — done 14 Oct 2026: surprise-sample reminders for loyal customers (3+ orders or ₹1,500+), recorded by the packer; verified-buyer reviews via a signed link per delivered order, checked by Sarita (negative reviews are published, with posting-rule rejections only), shown with star ratings, owner replies and Helpful votes. Later: automatic review-request WhatsApp after delivery (Meta template); Customers page with segments once there are 30–50 real customers.

- [x] Sales reports — done 13 Oct 2026: `/admin/reports` (Owner only), presets today → financial year + custom range, Excel (6 sheets) and PDF download. Still to add once on Vercel Pro: emailed daily / weekly / monthly reports via cron; GST sheet once invoices are live.

- [ ] WhatsApp restock command system
- [ ] DronaBot (Claude API streaming)
- [ ] Analytics event system
- [ ] Stock intelligence (health score, ABC)
- [ ] Repeat order nudge engine
- [ ] Admin intelligence dashboard
- [ ] Cron automation suite
- [ ] Mobile app (Expo)
- [ ] SEO — 5 seed blog articles

---

## Parking Lot
*(Ideas to revisit — not blocking anything)*

- **Product image in WhatsApp messages** (agreed 14 Oct 2026; start after ~100 confirmed orders and reviews): new templates `order_placed_image` and `order_delivered_image` with an image header showing the first item's hero photo. Fall back to the text-only templates when a product has no photo. Needs `NEXT_PUBLIC_CDN_URL` set.

- Vertex AI Imagen 3 for automatic product photography on new product creation
- Shiprocket integration for automatic tracking updates
- Google Play Console setup ($25 one-time)
- MSG91 as SMS backup for OTP
- Loyalty programme visible balance in app

---

## Definition of Done — Step 1

Step 1 is complete when:
- [ ] dronagiriherbal.in loads the new Next.js homepage
- [ ] All 20 products visible in catalog (with Sarita's photos)
- [ ] Admin can login at /admin/login
- [ ] Guest session cookie set on every page load
- [ ] Security headers verified in browser
- [ ] All environment variables confirmed working
