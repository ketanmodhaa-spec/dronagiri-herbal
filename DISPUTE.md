# DISPUTE.md — Dronagiri Herbal
> Open issues, unresolved conflicts, and things to revisit.
> Close entries with resolution when resolved.
> Last updated: 8 Oct 2026

---

## Open Issues

### [OPEN] — WhatsApp webhook verify token changed by accident
**Opened:** 8 Oct 2026
**Description:** `WHATSAPP_WEBHOOK_VERIFY_TOKEN` in Doppler was changed by mistake on 8 Oct 2026. The webhook at `/api/webhooks/whatsapp` answers Meta's `GET` verification handshake only when `hub.verify_token` matches this value, so it no longer matches whatever was entered in Meta Business Manager (if anything was).
**Impact:** None while the webhook is already verified — Meta only sends the handshake when the callback URL is saved. Incoming event `POST`s are authenticated by `WHATSAPP_WEBHOOK_APP_SECRET`, which was not touched. It bites the next time the callback URL is saved or re-verified in Meta: verification fails.
**Workaround:** None needed yet.
**Assigned to:** Jaydeep — before the next Meta webhook setup/re-verification
**Resolution:** ⏳ Open — set the same value in Doppler (`dev` / `prd`) and in Meta → WhatsApp → Configuration → Webhook "Verify token", then re-verify.

---

### [OPEN] — Razorpay KYC pending
**Opened:** 15 May 2026  
**Description:** Razorpay KYC requires Sarita's PAN, GST (24AQDPM2479C2Z1), and bank account. Not started.  
**Impact:** Cannot use live payment keys until KYC approved (1–2 business days).  
**Workaround:** Development proceeds with test keys (rzp_test_).  
**Assigned to:** Sarita Modha (Jaydeep to guide)  
**Resolution:** ⏳ Open

---

### [OPEN] — Product prices not confirmed
**Opened:** 15 May 2026  
**Description:** All 20 products on WordPress site show ₹299 — confirmed as placeholder price.  
**Impact:** Seed data cannot be finalised until real prices confirmed.  
**Assigned to:** Sarita to provide price list  
**Resolution:** ⏳ Open

---

### [OPEN] — DNS migration timing
**Opened:** 15 May 2026 | **Updated:** 20 May 2026 — canonical domain switched to .in  
**Description:** New site launches on **dronagiriherbal.in** (Vercel). Old WordPress at dronagiriherbal.com must be handled — either redirected to .in or moved to old.dronagiriherbal.com permanently.  
**Risk:** Brief downtime during DNS propagation (10–30 minutes). SEO impact if .com → .in redirect not configured correctly (301s required, sitemap regen, GSC change-of-address).  
**Plan:** TBD — pending Jaydeep's decision on .com fate (kill, redirect, or keep as old.*).  
**Assigned to:** Deployment agency + Jaydeep  
**Resolution:** ⏳ Open — scheduled for end of Step 1

---

### [OPEN] — Meta WhatsApp template approval
**Opened:** 15 May 2026 (as WATI) | **Updated:** 20 May 2026 — switched to direct Meta Business API  
**Description:** 13 WhatsApp message templates need to be submitted **directly to Meta Business Manager** for approval. Each takes 24–48 hours.  
**Impact:** No WhatsApp OTP delivery and no notifications until templates approved.  
**Assigned to:** Developer to write template content → Jaydeep to submit via Meta Business Manager  
**Resolution:** ⏳ Open — submit at least 1 week before launch

---

### [OPEN] — Google Search Console verification
**Opened:** 15 May 2026 | **Updated:** 20 May 2026 — domain switched to .in  
**Description:** URL prefix property attempted for dronagiriherbal.com. Domain property showed "Invalid domain" error. Now redirected at .in — new GSC property needed.  
**Current status:** URL prefix method not yet completed. Need GSC property for **dronagiriherbal.in** (treat .com as separate/old property).  
**Next step:** HTML tag method via Next.js layout.tsx (metadata.verification.google).  
**Resolution:** ⏳ Open

---

### [OPEN] — R2 orphan image cleanup
**Opened:** 22 May 2026  
**Description:** Phase 2 product images upload direct-to-R2 via presigned URL (presign → upload → confirm). If a client uploads the object to R2 but never reaches the confirm step (tab closed, network drop), the R2 object has no `ProductImage` row pointing at it — a storage orphan.  
**Impact:** Minor — admin-only surface, rare; wasted R2 storage only, no correctness issue.  
**Workaround:** None needed short-term.  
**Assigned to:** Developer — Step 3 line item.  
**Resolution:** ⏳ Open — add a weekly orphan-sweep cron that lists R2 objects with no matching `ProductImage` row and deletes them.

---

### [OPEN] — Legal pages must be live before Razorpay KYC
**Opened:** 22 May 2026  
**Description:** Razorpay requires the Refund Policy, Shipping Policy, Terms, and Contact details to be live and publicly accessible before approving the merchant account. These pages gate payment approval.  
**Impact:** Cannot complete Razorpay KYC → cannot accept online payments until `/terms`, `/privacy`, `/refund-policy`, `/shipping-policy` and `/contact` are live.  
**Dependency chain:** Sarita confirms the `[CONFIRM]` items → lawyer reviews → developer builds the 5 routes → pages go live → Razorpay KYC can be submitted.  
**Assigned to:** Sarita (confirm items) + lawyer (review) + Claude Code (build)  
**Resolution:** ⏳ Open

---

### [OPEN] — Neon cold-start on scale-to-zero
**Opened:** 22 May 2026  
**Description:** The scale-to-zero Neon branch sleeps after idle. The first request after idle is slow (2–5s) or briefly fails (`P1001`). Observed during admin-auth testing — the database woke and worked on retry.  
**Impact:** Low for admin (Sarita waits a few seconds occasionally). Higher for the public site — a customer hitting a cold start at checkout is bad.  
**Options:** (1) a retry wrapper on the Prisma client — recommended before public launch; (2) a cron ping to keep the branch warm — defeats the cost saving; (3) accept it.  
**Assigned to:** Claude Code — before public launch  
**Resolution:** ⏳ Open — decide before launch

---

### [OPEN] — Price change between cart and checkout
**Opened:** 7 Oct 2026
**Description:** The Phase 3 cart stores a display-only price snapshot per line (`priceSnapshotForBadgeOnly`) so the drawer can show a "Price updated" badge. Totals are always computed from live DB prices. Phase 4 must decide what happens when Sarita changes a price *after* the customer has seen the cart but *before* they pay — e.g. the customer reviews ₹299, opens checkout, price becomes ₹349 mid-flow.
**Impact:** Charging a price the customer did not see is a trust and consumer-law problem; silently honouring the old price is a revenue leak and violates "price always fetched server-side".
**Options:** (1) Checkout recomputes from DB and, if any line differs from what the checkout page rendered, blocks payment and re-shows the cart with the badge — customer must confirm again (recommended). (2) Price-lock for N minutes once checkout opens. (3) Accept silently.
**Assigned to:** Claude Code — Phase 4 checkout design
**Resolution:** ⏳ Open — decide in Phase 4 plan, before Razorpay order creation is built

---

### [OPEN] — Free-shipping threshold as an admin setting
**Opened:** 7 Oct 2026
**Description:** Phase 3 reads the free-shipping threshold from the `FREE_SHIPPING_THRESHOLD_PAISE` env var via `lib/config.server.ts` (₹499 = 49900 paise, matching the live shipping policy; set in Doppler `dev` / `stg` / `prd`). Changing it needs a Doppler edit and a redeploy. Sarita should be able to change it from the admin panel; the same value also appears in `content/legal/shipping-policy.md`, `SITE_DESCRIPTION` and the homepage trust badge, which must stay in sync.
**Impact:** Low until Sarita wants to change it — then a developer is required (violates mandate 2, owner-operated).
**Workaround:** Doppler env var; Sarita's shipping decision (AGENDA, 7 Oct) still pending.
**Assigned to:** Claude Code — post-Phase 3 (needs a small `StoreSetting` table + admin form; legal page text must render from the same value)
**Resolution:** ⏳ Open

---

### [OPEN] — Guest session first-visit verification
**Opened:** 7 Oct 2026
**Description:** The guest session middleware mints the `dh_guest_session` cookie on the *response*, so a route handler serving that same first request cannot read it. For the cart, a first-ever `POST /api/cart/items` would find no session. Phase 3 fixes this by forwarding the session id to the handler on a request header (stripping any client-supplied copy). Live behaviour on production has not yet been verified end to end.
**Impact:** Without the fix, a visitor whose very first request is an add-to-cart loses that add.
**Test matrix items (must pass before Phase 3 ships):**
- **First:** clean browser profile (no cookies) deep-links straight to a product page, e.g. `/products/hibiscus-shampoo` from a WhatsApp/Instagram link → response sets `dh_guest_session`, and the very first tap on Add to cart succeeds; reload shows the item still in the cart
- Fresh client, `GET /` → response sets `dh_guest_session` (HttpOnly, Secure, SameSite=Lax, Max-Age=604800)
- Fresh client, first request is `POST /api/cart/items` → item is added AND cookie is set; the next `GET /api/cart` with that cookie returns the item
- Client sends a forged `x-guest-session-id` header → ignored; cart is keyed only to the verified cookie
- Tampered / expired / wrong-key cookie → replaced with a fresh session, never accepted
- Token within 2 days of expiry → re-issued with the same session id; cart survives
**Progress (7 Oct 2026):** Cookie half verified on production with cookie-less `curl` — both `GET /` and the deep link `GET /products/hibiscus-shampoo` return `200` with `Set-Cookie: dh_guest_session=…; Path=/; Max-Age=604800; Secure; HttpOnly; SameSite=lax`; JWT payload carries only `sub` (UUID), `iat`, `exp`. The add-to-cart half of the first item needs the Phase 3 cart.
**Progress (8 Oct 2026):** Full matrix passes locally (22/22, `next dev` on the Neon `dev` branch + new Upstash DB, `NEXT_PUBLIC_ENABLE_CART=true`): deep link → first add-to-cart succeeds and persists; cold `POST /api/cart/items` adds the item and sets the cookie; forged `x-guest-session-id` ignored with and without a cookie; tampered / wrong-key / expired / `alg=none` cookies replaced with a fresh empty session; near-expiry token re-issued with the same id and the cart survives; fresh tokens not re-issued. Also checked: a body carrying a price is rejected (400), 1 + 5 clamps to 5 with a `MAX_PER_LINE` notice, unknown product → 404, DELETE removes the line. Remaining: repeat the deep-link + first-add check on production once the cart flag is turned on there (Phase 4).
**Assigned to:** Claude Code — Phase 3
**Resolution:** ⏳ Open

---

## Closed Issues

### [CLOSED 8 Oct 2026] — Upstash Redis database replaced
**Opened:** 8 Oct 2026 | **Closed:** 8 Oct 2026
**Description:** The original Upstash database (`live-hyena-132712`) disappeared — its hostname no longer resolves. Every Redis call failed, so production admin login returned HTTP 500 (the login rate limiter runs first), and the presign limiter and cart could not work. A new database `rare-skunk-212768` was created and its REST URL + token set in Doppler `dev` and `prd`; both answer `PONG` (verified 8 Oct). `stg` has no Upstash vars.
**Impact:** Production admin login was down (HTTP 500) until the redeploy.
**Assigned to:** Jaydeep — redeploy production; then find out why the old database vanished (free-tier inactivity?) so it does not recur.
**Resolution:** ✅ Resolved 8 Oct 2026 — production redeployed (Vercel, same commit `53593f8`) with the new Upstash values; `POST /api/admin/auth/login` with an empty body now returns 400 `INVALID_REQUEST` instead of 500. Follow-up (not a blocker): find out why `live-hyena` was removed (free-tier inactivity?) so it does not recur.

---

### [CLOSED 21 May 2026] — Production Neon branch has no schema
**Opened:** 21 May 2026 | **Closed:** 21 May 2026
**Description:** The init migration (15 tables) and the dev seed had been applied only to the `dev` branch (`br-long-pine`, endpoint `ep-square-fire`). The primary/production branch (`br-sweet-wildflower`, endpoint `ep-restless-hill`) was empty — no tables. Doppler `prd` `DATABASE_URL`/`DIRECT_URL` correctly pointed at the production branch, but a prod deploy would have failed every query with `relation does not exist`.
**Decision (canonical branch):** The primary branch `br-sweet-wildflower` is the canonical / production branch — Neon's primary branch is the long-lived, undeletable root. `br-long-pine` is the standing protected `dev` branch. Staging gets its own child branch off primary when needed. (Both branches were already renamed `production` / `dev` in the Neon console.)
**Resolution:** ✅ Resolved 21 May 2026 — ran `prisma migrate deploy` (via `doppler run --config prd`) against the production branch's `DIRECT_URL`. Migration `20260521062216_init` applied; all 15 tables + `_prisma_migrations` present; `prisma migrate status` reports "Database schema is up to date". The dev seed was deliberately NOT run on production — it is ₹299 placeholder data; Sarita's real catalogue is entered via the admin panel. Remaining follow-up (not a blocker): wire `stg` `DATABASE_URL`/`DIRECT_URL` when staging work begins.

---

### [CLOSED 20 May 2026] — Firebase Admin SDK blocked
**Opened:** 15 May 2026 | **Closed:** 20 May 2026  
**Original description:** Google Workspace org policy `iam.disableServiceAccountKeyCreation` prevented service account key creation. Needed for server-side OTP verification.  
**Resolution:** ✅ Resolved by dropping Firebase entirely. Switched to Meta WhatsApp Business API for OTP — no Firebase Admin SDK dependency at all. See [20 May 2026] entry in MEMORY.md.

---

### [CLOSED 22 May 2026] — Production admin account not seeded
**Opened:** 22 May 2026 | **Closed:** 22 May 2026
**Description:** Sarita's admin account existed only on the Neon `dev` branch; the production branch was unseeded, so there was no admin account to sign in with on the live site.
**Resolution:** ✅ Resolved 22 May 2026 — ran `doppler run --project dronagiriherbal-in --config prd -- pnpm --filter @dronagiri/db db:ensure-admin`. The owner account `store@dronagiriherbal.in` (role OWNER) was created on the production branch with the password from Doppler `prd` → `ADMIN_SEED_PASSWORD`. Sarita changes it on first login via the change-password screen. The `ensure-admin` script is idempotent and never overwrites an existing password, so the run is safe to repeat.

---

### [CLOSED 22 May 2026] — Untracked apps/brand/ folder
**Opened:** 22 May 2026 | **Closed:** 22 May 2026
**Description:** An untracked `apps/brand/` folder appeared in the repo; its origin was unknown.
**Resolution:** ✅ Resolved 22 May 2026 — identified as `apps/brand/Dronigiri logo.cdr`, the brand logo in CorelDRAW format. It is a legitimate brand asset and has been committed to the repo. Minor follow-up: the filename is misspelled "Dronigiri" — worth renaming to "Dronagiri" at some point.

---

### [CLOSED 22 May 2026] — Admin image-presign endpoint not rate-limited
**Opened:** 22 May 2026 | **Closed:** 22 May 2026
**Description:** `POST /api/admin/uploads/presign` sat behind `requireAdmin()` but had no rate limit — a runaway client loop could request presigned URLs unbounded.
**Resolution:** ✅ Resolved 22 May 2026 — added an Upstash sliding-window limiter (60 presigns / 10 min per client IP) on the presign route, alongside the existing admin-login limiter. Surfaced and fixed during the Phase 2b pre-flight review.

---

## [Template for new entries]

### [STATUS] — Title
**Opened:** DD MMM YYYY  
**Description:**  
**Impact:**  
**Workaround:**  
**Assigned to:**  
**Resolution:** ⏳ Open / ✅ Closed [DD MMM YYYY] — [how it was resolved]
