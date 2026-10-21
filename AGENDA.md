# AGENDA.md — Dronagiri Herbal
> Current tasks, sprint, and priorities.
> Update this file at the start and end of every work session.
> Last updated: 19 Oct 2026

---

## Launch plan — online-payment-only checkout (decided 19 Oct 2026)

**Decision:** the public cart opens with **online payment only**. A prepaid order proves the buyer is real, so OTP is not needed for it. **COD + WhatsApp OTP follow as Phase 2** (COD up to ₹2,000, stock taken at placement). Target: ~5 build days after Dussehra, then a one-week soft launch with ~20 invited customers before announcing.

**Already live (19 Oct):** Razorpay live keys + webhook in `prd` — first live payment DH-26-00001 paid by UPI, settled by the webhook, cancelled and refunded (see AUDIT.md). Admin-created orders + pay link (`/admin/orders/new` → `/pay/…`) — the way orders are taken until the cart opens. Cart UI built behind `NEXT_PUBLIC_ENABLE_CART`.

### Go-live gates — all five must be green
- [ ] **Build** — days 1–5 below
- [ ] **Vercel Pro** — Hobby is non-commercial use only; paid orders already flow, so upgrade now. Then fill `vercel.json` crons.
- [ ] **Neon paid plan** — daily snapshots, ≥ 7 days history, `production` branch protected, one practice restore
- [ ] **GST** — CMP-04 effective (Regular scheme) + HSN/rates from the CA. Until then: Gujarat-only sales, Bill of Supply
- [ ] **Dress rehearsal** — day 5

### Build — day by day
**Day 1 — Messages** ✅ *(done 21 Oct — WhatsApp switched on in prd)*
- [x] Wire templates to order events, background, never blocking, all logged: `order_confirmed` (payment received), `order_shipped` (courier + AWB), `order_delivered`, `order_cancelled`, `refund_initiated`, `refund_completed`. Skip `order_packed`.
- [x] Sarita on every paid order: `new_order_alert` to 94290 29840 + email copy to store@ (never on unpaid orders).
- [x] Admin **Messages** page — the NotificationLog (sent / failed / why), so delivery can be checked without a developer.
- [x] *(21 Oct: done differently — dev keeps `ENABLE_WHATSAPP` unset, so dev sends are only logged; all templates verified live to our own numbers instead.)* Point Doppler `dev` at the test WhatsApp account (1534533821662577) so laptop tests can't message real customers. Test every template on our own number, then set `ENABLE_WHATSAPP=true` in `prd`.

**Day 2 — Checkout**
- [ ] Cart → checkout page: name, phone, address (state picker), Terms checkbox, marketing consent **unticked** (`recordMarketingConsentInTx`).
- [ ] Place order with the admin-order service (server prices, ₹49 / free over ₹499, idempotency key, phone-first Customer) → pay page. ONLINE only.
- [ ] Rate limit checkout 5/min (CLAUDE.md rule 5). Unpaid orders lapse after 24h, holding no stock.

**Day 3 — Tracking + stock**
- [ ] Order tracking page `/track/<signed token>` (HMAC like review/pay links), linked from every customer message.
- [ ] Low-stock alert when a sale crosses `lowStockThreshold` — email to store@ now; WhatsApp once a **Utility** stock template is approved (`restock_alert` was submitted as Marketing — if approved that way, create `stock_low_alert` as Utility).

**Day 4 — Fulfilment paper**
- [ ] Printable packing slip from the order page (brand strip, ship-to, items, order no.).
- [ ] GST invoice wired to paid orders — only if the CA facts are in; otherwise Bill of Supply note.

**Day 5 — Dress rehearsal, then open**
- [ ] 5 real-phone orders: pay by UPI, failed payment then retry, cancel → refund, last-unit race (second buyer → Needs attention), ship → deliver with messages checked at each step.
- [ ] Set `NEXT_PUBLIC_ENABLE_CART=true` in `prd` → redeploy (public var, baked at build).
- [ ] Soft launch: invite ~20 customers for a week; fix what they hit; then announce.

### Phase 2 — COD with WhatsApp OTP (~1.5 days, after soft launch)
- [ ] OTP screens on checkout. `otp_login` has a Copy-code **URL button**: the send must also fill the button parameter with the code, or Meta rejects it — verify with a live OTP.
- [ ] COD option up to ₹2,000; stock taken at placement; `order_placed` to the customer; COD collected tracking.

### Later (needs Vercel Pro crons)
- [ ] `daily_summary` to Sarita (approved as Marketing; the code sends it as Utility to skip the customer consent gate)
- [ ] Repurchase / win-back nudges (marketing consent only)
- [ ] Shiprocket API (manual handoff until ≥ 10 orders/day)

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
- [x] **"How it feels" on product pages** — done 15 Oct 2026: texture, aroma (several allowed), skin/hair finish, and leave-on / rinse-off with a short time note. Fixed choices set in Admin → Products → How it feels; also sent to Google as product properties. Draft values from the pamphlet filled by `db:sensory-drafts` (only on products with nothing set).
- [ ] **Sarita: check the "How it feels" drafts** — every product, especially aromas and the time notes. Multani Mitti has no time note (not in the pamphlet). Later: shop filters ("unscented", "rinse-off") and quiz matching on these fields.
- [x] **No double entry of a product** — done 15 Oct 2026: the admin form warns "Product already entered" as soon as the name and size match an existing product (inactive ones included, with a link to open it), and the server refuses the save on create and on edit. Matching ignores spaces, capitals and punctuation ("Aloevera Gel" = "Aloe Vera Gel") and unit spellings ("100 Gms." = "100 g"); a blank size matches any size; different sizes are different products. Near-names ("Jasmin Hydra" vs "Jasmin Hydra Toner") are not caught.
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
