# Dronagiri Herbal — Pre-Launch QA Checklist
**Prepared for:** Claude Code full-system audit
**Context:** 3 sample orders placed by family. System functionally works end-to-end.
**Goal:** Find what breaks when a real stranger — not a cooperative tester — uses the site.
**Format:** Each line is independently testable. Tick, flag, or escalate.

---

> ## How to run this
>
> Three personas. Each walks through their flow pretending they have
> never used the site before and will do the dumbest reasonable thing
> at every step. The goal is not to confirm the happy path — it's to
> find the ten edge cases that will cause the first real complaint.
>
> Mark each item: ✅ Pass · ⚠️ Flagged · ❌ Fail · 🔄 N/A yet
>
> For every ⚠️ and ❌, add a one-line note on what broke.

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART A — CASUAL VISITOR JOURNEY
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## A1. Arrival & discovery

- [ ] Lands on `dronagiriherbal.in` from a fresh browser (no cookies) — page loads under 3 seconds on 4G
- [ ] Lands directly on `/products/hibiscus-shampoo` from a WhatsApp link — guest session cookie set, page renders cleanly
- [ ] Lands on an invalid URL `/products/does-not-exist` — gets a branded 404, not a Next.js default
- [ ] Lands on a deactivated product's URL (previously-live, now `isActive: false`) — gets 404 or "no longer available" page, not a crash
- [ ] Opens the site on a 380px mobile viewport — nothing overflows horizontally, no horizontal scroll bar
- [ ] Opens the site on a 1920px desktop — content doesn't stretch grotesquely wide
- [ ] Opens the site with JavaScript disabled — at minimum the homepage and product pages render readable content (even if cart is disabled)
- [ ] Opens on an iPad / 768px tablet — layout isn't broken between mobile and desktop breakpoints

## A2. Catalogue browsing

- [ ] Homepage "Bestsellers" grid loads 8+ products with real images, not placeholders
- [ ] Shop page `/shop` loads all active products — none missing, none duplicated
- [ ] Category filters (Hair / Skin / Toners / Wellness) show correct products in each
- [ ] Switching categories doesn't cause a full page reload (if intended as client-side filter)
- [ ] A product with 0 stock still appears in listings as "Out of stock" — not silently hidden (good for SEO + "notify me")
- [ ] Product cards show price in ₹ format, never raw paise, never `29900`
- [ ] Clicking a product card takes you to its correct detail page
- [ ] Browser back button after visiting a product returns to the same scroll position on the grid

## A3. Product detail page

- [ ] Product image loads from R2 CDN — not broken, not stretched, not pixelated
- [ ] "Tap to zoom" works on mobile — doesn't break on desktop
- [ ] Product with only one image doesn't show empty thumbnail slots
- [ ] Benefits, ingredients, how-to-use accordions open and close cleanly
- [ ] English/Gujarati toggle (if live) switches content without a full page reload
- [ ] A product with empty Gujarati content doesn't show "undefined" or blank — falls back to English
- [ ] Stock indicator ("In stock" / "Only 2 left" / "Out of stock") matches actual DB stock
- [ ] Qty selector shows 1 by default; +/- buttons work
- [ ] Tap + rapidly 10 times — qty does NOT jump to 10 if stock/limit is 5 (clamp works)
- [ ] Tap + rapidly 10 times — only the right number of API calls fire (not 10)
- [ ] Type "99" directly into qty field, then blur — clamps to 5 with a toast
- [ ] Type "0" into qty field, blur — clamps to 1, does not remove line
- [ ] Type "abc" into qty field, blur — reverts to previous valid value
- [ ] Paste a long number like "9999999999" — clamps correctly, doesn't crash
- [ ] "Add to cart" button disabled when stock is 0 — physically cannot click
- [ ] "Add to cart" button disabled while a previous add is in flight (prevents double-submit)
- [ ] Add-to-cart success → toast appears with correct product name and quantity
- [ ] Add-to-cart error (stock dropped between view and click) → clear error message, not silent failure
- [ ] Share product page URL to someone else → they land on the same page with same content (no session-leaking URL)

## A4. Cart drawer behaviour

- [ ] Cart icon in nav shows correct item count — updates in real-time after add
- [ ] Opening the cart drawer shows all items with current DB prices
- [ ] Line item image, name, price, qty controls all render correctly
- [ ] Updating qty in the drawer updates the subtotal immediately
- [ ] Removing a line item updates the subtotal and item count badge
- [ ] Removing the last item → drawer shows a graceful empty state
- [ ] Free shipping bar updates as qty/items change
- [ ] Free shipping threshold hit → bar celebrates "unlocked free shipping"
- [ ] Add product A to cart → change price in admin to a higher value → reopen cart → shows new price with "Price updated" badge
- [ ] Price badge logic doesn't fire if the quantity is edited (only on actual price change)
- [ ] Add same product twice from different pages → cart shows one line with cumulative qty, not two separate lines
- [ ] Try to add a 6th unit when 5 are already in cart → clamp to 5 with explicit toast "Max 5 per order"
- [ ] Add a product → deactivate it in admin → reopen cart → line shows "no longer available" state, not a crash
- [ ] Close drawer, navigate to different product, open drawer → shows current cart (not stale)
- [ ] On mobile, drawer takes full width (not 300px drawer on 380px screen)
- [ ] On mobile, body scroll is locked when drawer is open
- [ ] Drawer close button works; tapping overlay also closes drawer
- [ ] "Proceed to checkout" button present and clickable (now that checkout exists)

## A5. Session & cart persistence

- [ ] Close browser, reopen within 7 days → cart items still there
- [ ] Switch from Chrome to Safari on same device → cart does NOT follow (Option A — session-scoped, correct)
- [ ] Clear browser cookies → cart resets to empty (expected)
- [ ] Open site in incognito tab while regular tab has cart → two separate carts (expected)
- [ ] Leave tab open for 20 minutes, return → cart still correct, price refreshes if stale
- [ ] Session cookie `dh_guest_session` has HttpOnly, Secure, SameSite=Lax, Path=/
- [ ] Cart cookie survives a hard refresh (Ctrl+F5)

## A6. Checkout flow (the money moment)

- [ ] Click "Proceed to checkout" → address form loads
- [ ] Name field accepts common Indian names including those with periods, apostrophes
- [ ] Phone field accepts 10-digit mobile without country code (adds +91 server-side)
- [ ] Phone validation rejects landline numbers starting with 2/3/4/5
- [ ] Phone validation rejects numbers under 10 digits
- [ ] Pincode validation rejects anything other than 6 digits
- [ ] Pincode entered → city/state auto-populate (if that feature exists) and are editable
- [ ] Address line 1 / line 2 accept special characters common in Indian addresses: `#`, `/`, `-`, `,`
- [ ] Email field is optional — can proceed without entering it
- [ ] Email validation only triggers if a value is entered
- [ ] Required fields show inline errors, not generic form-level errors
- [ ] Submit form with network throttled to slow 3G → clear loading state, no double-submit possible
- [ ] COD option visible and selectable
- [ ] Razorpay option visible and selectable
- [ ] Razorpay opens in a modal (test mode) → test card payment succeeds → returns to confirmation page
- [ ] Razorpay payment failure → clear error, cart preserved, user can retry
- [ ] Razorpay — close the modal mid-payment → order marked PAYMENT_PENDING, not CONFIRMED; stock not deducted yet
- [ ] COD selection → order confirmed immediately, stock deducted, confirmation page shown
- [ ] Order confirmation page shows order number, total, delivery address summary, tracking link
- [ ] Order token in URL is unguessable (long random string, not sequential ID)
- [ ] Hit back button after order placed → does NOT allow re-submission of the same order
- [ ] Open the tracking link in incognito → still works (public tracking, no login required)
- [ ] Tracking link with a wrong/invalid token → shows generic "order not found", does NOT leak information about valid orders
- [ ] Required legal consent checkbox blocks submit if unchecked
- [ ] Optional marketing consent checkbox saves state correctly on Customer/GuestContact row with timestamp

## A7. Notifications after order

- [ ] WhatsApp order confirmation received at the exact phone entered
- [ ] WhatsApp message has correct order number, amount, product list
- [ ] WhatsApp message tracking link works and loads tracking page
- [ ] If email was provided, email confirmation received within 2 minutes
- [ ] Email renders correctly in Gmail web, Gmail mobile app, Outlook
- [ ] Email tracking link works
- [ ] No notification channel failure (WhatsApp/email/SMS) blocks the order confirmation page
- [ ] Admin (Sarita) receives her own WhatsApp alert for the new order within 1 minute

## A8. Price & promotion correctness

- [ ] Product listed at ₹299 in catalogue → shows ₹299 in cart → shows ₹299 at checkout → charged ₹299
- [ ] Promotion active (if any live) → discount applied in cart, visible in checkout breakdown
- [ ] Promotion expires between cart view and checkout → user sees "sale ended" message with new total, must confirm before paying
- [ ] Free shipping threshold works both ways: above threshold = free, below = correctly calculated shipping charge
- [ ] GST breakdown shown clearly (if applicable at this stage) — subtotal, GST, shipping, total
- [ ] All amounts round correctly — no `₹299.0000001` floating-point artifact anywhere
- [ ] Final charged amount matches displayed grand total to the paisa

## A9. Legal, trust, contact

- [ ] Footer links to all 5 legal pages — none 404
- [ ] Privacy policy, Terms, Refund, Shipping, Contact pages all load with real content (not placeholders)
- [ ] Contact page shows phone, WhatsApp, email, business hours, and grievance officer
- [ ] "Last updated" date on legal pages is recent
- [ ] WhatsApp link in footer opens WhatsApp with pre-filled greeting if possible

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART B — ADMIN WORKFLOW (Sarita's daily use)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## B1. Login & session

- [ ] Admin login at `/admin/login` loads cleanly on mobile (Sarita's primary device)
- [ ] Login with correct credentials → lands on admin dashboard
- [ ] Login with wrong password → same error as login with wrong email (no enumeration)
- [ ] 6th wrong attempt → rate-limited with 429
- [ ] Show-password toggle works on login and change-password screens
- [ ] "Remember me" (if present) extends session appropriately
- [ ] Admin session survives browser close; refreshes silently via refresh token
- [ ] Logout clears cookies and redirects to login
- [ ] Direct URL access to `/admin/orders` without login → redirects to login, not blank page

## B2. Order management

- [ ] New order appears in `/admin/orders` list within 10 seconds of placement
- [ ] Orders list shows order number, customer name, phone, amount, status, placed-at time
- [ ] Default sort is newest first
- [ ] Can filter by status: PENDING, CONFIRMED, PROCESSING, SHIPPED, DELIVERED, CANCELLED
- [ ] Can search by phone number or order number
- [ ] Clicking an order opens detail page with: line items, shipping address, payment status, order timeline
- [ ] Order status change (CONFIRMED → PROCESSING) → saved immediately, timeline updated
- [ ] Status change triggers correct customer WhatsApp notification
- [ ] Order status change creates a corresponding OrderEvent row (audit trail)
- [ ] Marking SHIPPED prompts for tracking number + courier name (required fields)
- [ ] Marking DELIVERED triggers delivery notification to customer
- [ ] COD order marked DELIVERED → prompt to mark "Cash collected" separately
- [ ] Cannot skip status forward illegally (e.g., CONFIRMED → DELIVERED directly) — enforced
- [ ] Cannot revert status backward silently — any reversal logged with reason
- [ ] Print-friendly order view / invoice available for packing slip
- [ ] Order detail shows IP address, user agent for fraud check (admin-only)

## B3. Product management

- [ ] Create new product → appears in storefront within 60 seconds (ISR refresh)
- [ ] Price entered in ₹ (rupees), stored as paise correctly
- [ ] Attempt to enter negative price → rejected with clear error
- [ ] Attempt to enter price > ₹1,00,000 → rejected (sanity cap)
- [ ] Attempt to enter decimal paise (29.9 rupees) → rounds correctly or rejects
- [ ] Slug auto-generates from English name; override allowed at create time
- [ ] Slug collision with existing product → clear error, suggests `-2` suffix
- [ ] Edit slug on a live product → warning dialog about SEO/link impact
- [ ] Image upload to R2 — tested with: tiny JPG (10KB), huge JPG (8MB), PNG, WEBP
- [ ] Image upload rejected for: PDF, GIF (if not allowed), executable, oversized file
- [ ] Image upload progress visible to user
- [ ] Image upload fails mid-upload (close tab) → no half-written orphan on R2 (or at worst, cleanable later)
- [ ] Alt text field accepts both English and Gujarati
- [ ] Set product as featured → appears in homepage grid
- [ ] Toggle isActive off → product disappears from storefront within 60s, direct URL 404s
- [ ] Set lowStockThreshold — product shows "Only X left" when stock drops below threshold
- [ ] Soft-delete only; no destructive delete button accessible

## B4. Stock management — the ledger

- [ ] Admin edits stock from "50" to "60" → StockMovement row created with delta +10, reason ADJUSTMENT, source ADMIN_PANEL, createdBy = admin id
- [ ] Admin edits stock from "50" to "0" → movement row created with delta -50, balance 0
- [ ] Admin attempts to edit stock below 0 → rejected with clear error
- [ ] Opening stock on new product creation → movement row created with reason RESTOCK, source ADMIN_PANEL
- [ ] Order placement decrements stock atomically → movement row with reason SALE, source ORDER
- [ ] Order cancellation restores stock → movement row with reason CANCELLATION, source ORDER
- [ ] Can view full stock movement history per product
- [ ] Stock balance in Product table always matches sum of StockMovement deltas (reconciliation check)
- [ ] Two admins editing same product simultaneously → row lock prevents inconsistent state

## B5. Category management

- [ ] Create category → immediately available for product assignment
- [ ] Edit category name → reflects everywhere without cache lag
- [ ] Deactivate category with products in it → products still accessible; UI shows warning
- [ ] Attempt to delete category with products → blocked with explanation
- [ ] Sort order changes reflected on storefront

## B6. Shipping workflow

- [ ] Admin can bulk-view all "ready to ship" orders in one list
- [ ] Can print shipping labels / invoice in one go (if feature exists)
- [ ] Tracking number entry validates format for common couriers
- [ ] Entering wrong tracking format → warned but not blocked
- [ ] Shipping charge calculated correctly per order based on cart total and threshold
- [ ] Free shipping threshold is configurable via env var or settings (not hardcoded)

## B7. Finance & GST

- [ ] Each order's GST breakdown stored at order time (immutable snapshot) — not computed from current rates
- [ ] GSTIN on invoice matches `24AQDPM2479C2Z1`
- [ ] HSN code per product on invoice (cosmetics typically HSN 3304/3305) — [SARITA/CA confirms correct HSN per product]
- [ ] Invoice has sequential invoice number per financial year (statutory requirement)
- [ ] Invoice shows: seller GSTIN, buyer name + address, HSN, taxable value, CGST + SGST (intra-state) or IGST (inter-state), total
- [ ] Intra-state (Gujarat) order → CGST 9% + SGST 9% = 18% split correctly
- [ ] Inter-state order → IGST 18% applied correctly
- [ ] COD order → GST on product only, not on COD fee (if any)
- [ ] Refund issued → credit note generated with reference to original invoice
- [ ] Export to CSV/Excel for the CA at month-end
- [ ] Date-range filter for financial reports

## B8. Admin dashboard

- [ ] Today's orders count accurate
- [ ] Today's revenue accurate (paid orders only, not including cancelled)
- [ ] This week vs last week comparison correct
- [ ] Low-stock products highlighted (below lowStockThreshold)
- [ ] Pending-to-pack queue count accurate
- [ ] Pending COD collections visible separately
- [ ] Dashboard loads under 3 seconds (parallel queries)
- [ ] Dashboard works on Sarita's phone — all widgets readable on 380px

## B9. Admin notifications

- [ ] New order WhatsApp received by Sarita on correct number
- [ ] Low-stock daily WhatsApp sent at 8 AM IST
- [ ] Daily summary WhatsApp sent at 9 PM IST
- [ ] Payment failure WhatsApp sent to Sarita (for investigation)
- [ ] Refund failure WhatsApp sent to Sarita (urgent action)
- [ ] All admin notifications go to +91 94290 29840 only, never to a customer by mistake

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART C — THINGS THAT KILL SMALL E-COMMERCE
# (not in A or B, but historically fatal)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## C1. Race conditions & edge cases

- [ ] Two customers add the last unit of a product simultaneously → one succeeds, the other gets clean "out of stock" at checkout
- [ ] Customer in cart when Sarita deactivates the product → customer sees "no longer available" at checkout
- [ ] Customer in checkout when Sarita changes price → "price updated, confirm" screen appears
- [ ] Promotion expires at 11:59:59 PM while customer is on checkout page → authoritative server check at order creation, graceful handling
- [ ] Razorpay webhook arrives before the client-side confirmation → no double-fulfillment (idempotency key check)
- [ ] Razorpay webhook arrives 30 minutes late → order status reconciled, no duplicate stock deduction
- [ ] Customer rapidly submits checkout 5 times with the same card → idempotency key prevents 5 charges

## C2. Security hardening

- [ ] All `/api/admin/*` routes return 401 without admin JWT
- [ ] All `/api/cart/*` routes return 401 without guest session cookie
- [ ] Razorpay webhook signature verified with timing-safe comparison
- [ ] Razorpay webhook with wrong signature → 401, nothing processed
- [ ] Admin JWT uses RS256 (asymmetric), not HS256
- [ ] CORS configured — API only accepts requests from `dronagiriherbal.in`, not `*`
- [ ] CSP header set — prevents inline script injection
- [ ] HSTS header set — forces HTTPS
- [ ] Rate limiting active on login, checkout, cart mutation, payment endpoints
- [ ] No stack traces leaked in production error responses
- [ ] No console.log statements leaking sensitive data in browser console
- [ ] No API keys / secrets in browser-accessible JavaScript bundles (grep the compiled JS)
- [ ] SQL injection: tested with `'; DROP TABLE products;--` in search field → safely handled (Prisma parameterises)
- [ ] XSS: tested by entering `<script>alert(1)</script>` in name field → escaped, not executed
- [ ] Phone number in URL (tracking) → not personally identifiable (uses hashed token)

## C3. Data integrity

- [ ] Delete a product that has orders → blocked (Restrict), soft-delete only
- [ ] Delete a customer → their past orders remain accessible for GST compliance
- [ ] Edit a product's price → past OrderItem snapshots unchanged (immutability working)
- [ ] Database backups automated — daily, retained for 30 days minimum
- [ ] Backup restore tested at least once (not just "we have backups")
- [ ] Neon branch strategy: production separate from dev, dev separate from staging if used

## C4. Mobile reality

- [ ] Entire checkout completable on Sarita's phone without zooming
- [ ] Entire admin panel usable on Sarita's phone (she will NOT have a laptop at the kitchen table)
- [ ] All CTAs ≥ 44×44px tap targets
- [ ] Numeric inputs trigger numeric keyboard (`inputMode="numeric"`)
- [ ] Phone inputs trigger phone keyboard (`inputMode="tel"`)
- [ ] Email inputs trigger email keyboard
- [ ] Date pickers use native mobile pickers, not desktop widgets
- [ ] Scroll locked on modal/drawer open (prevents accidental background scroll)
- [ ] Buttons don't jump around during loading state (reserve space)

## C5. SEO & social

- [ ] Each product page has unique `<title>` and meta description
- [ ] Each product page has Open Graph tags (image, title, description) → shares nicely on WhatsApp/Facebook
- [ ] Product structured data (JSON-LD) with price, availability, image → Google can index it as a product
- [ ] sitemap.xml generated and accessible at `/sitemap.xml`
- [ ] robots.txt allows crawlers for shop, disallows for /admin
- [ ] GA4 tag `G-Z0GJEECHZP` firing on every page (verify in GA real-time)
- [ ] Favicon shows correctly in browser tab
- [ ] 404 page helps customer get back to shop, not a dead end
- [ ] Google Search Console verified — sitemap submitted

## C6. Performance

- [ ] Homepage Lighthouse score ≥ 85 mobile, ≥ 90 desktop
- [ ] Product page LCP (Largest Contentful Paint) under 2.5s on 4G
- [ ] No layout shift when fonts load (CLS score low)
- [ ] Images served via Cloudflare R2 CDN, not origin
- [ ] Images lazy-loaded below the fold
- [ ] Next.js Image component used everywhere (automatic optimisation)
- [ ] Total JavaScript bundle under 300KB gzipped for storefront pages

## C7. Monitoring & alerting

- [ ] Sentry capturing errors in production — tested with a deliberate error
- [ ] Sentry alerts configured to notify on new error type
- [ ] Vercel Analytics or similar tracking real user metrics
- [ ] Uptime monitoring (e.g., UptimeRobot) pinging the site every 5 minutes
- [ ] Downtime alert goes to a channel Sarita + Jaydeep both see
- [ ] Neon cold-start retry wrapper in place (deferred item from earlier)
- [ ] Rate limit hits logged, not silently absorbed

## C8. Legal & compliance (India-specific)

- [ ] All 5 legal pages live and reviewed by a lawyer or CA
- [ ] Shipping policy mentions dispatch timeline, delivery timeline, who pays return shipping
- [ ] Refund policy specifies the 7-day window and hygiene exclusion
- [ ] Grievance officer named with contact (Consumer Protection Act requirement)
- [ ] DPDP Act consent capture at checkout (required + optional marketing)
- [ ] Cookie consent banner (if using analytics) — or justified why not needed
- [ ] Razorpay KYC approved — live keys in use, not test keys
- [ ] Business registration numbers in footer: UDYAM, KVIC, GST — all accurate

## C9. The honest pre-launch "walk through it as a stranger"

Have **one person who has NEVER used the site** do each of these without help:

- [ ] Find a specific product by category
- [ ] Add 2 different products to cart
- [ ] Change the quantity in the cart
- [ ] Remove one item from cart
- [ ] Complete a checkout with COD
- [ ] Track the order using only the WhatsApp link received
- [ ] Find the refund policy from any page
- [ ] Find Sarita's phone number from any page

If they get stuck or confused at any step — that's a bug, even if the code "works."

## C10. The things we deliberately deferred — confirm still deferred

- [ ] Marketing broadcast (admin → all customers) → Step 3, intentionally not built
- [ ] Orphan R2 image sweep cron → logged in DISPUTE, intentionally not built
- [ ] WhatsApp restock command → Phase 3+ in roadmap, intentionally not built
- [ ] DronaBot AI advisor → intentionally not built
- [ ] Hair/skin quiz → intentionally not built
- [ ] Loyalty tier display (if built) → confirmed working as per Jaydeep's note
- [ ] International shipping → confirmed deferred until India business is steady

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART D — SARITA-SPECIFIC READINESS
# (not code — people and process)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

These aren't code bugs — but if any of these aren't ready, the launch
is premature regardless of how clean the code is.

- [ ] Sarita has changed her admin password from the seed value
- [ ] Sarita knows how to update order status from her phone (walk-through done)
- [ ] Sarita knows how to add a new product via admin (walk-through done)
- [ ] Sarita knows how to update stock after a production batch
- [ ] Sarita has her shipping materials ready: boxes, bubble wrap, labels
- [ ] Sarita has decided on shipping partner (Delhivery, Shiprocket, India Post?)
- [ ] Pickup arrangement with courier confirmed
- [ ] Return address labelled and ready
- [ ] First week post-launch — Sarita blocks time to respond to WhatsApp orders personally
- [ ] You (Jaydeep) are available for the first week to catch any bug the moment it surfaces

---

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# PART E — HAND BACK TO ARCHITECT
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

After Claude Code runs this list, bring back:

1. The full table with ✅/⚠️/❌ marks per line
2. For every ⚠️ and ❌, a one-line note on what was found
3. Recommendation on which failures block launch vs can ship with a workaround
4. Any new DISPUTE.md items opened as a result of this audit
5. Specifically — the three family orders already placed: were there any surprises in the data, timing, or notifications? What did Sarita say about receiving them?

The goal of this list is not to pass every item on the first try. It's
to find the 10 things that would surprise us in week one. Finding them
now is cheap. Finding them when a stranger has lost ₹299 is expensive.
