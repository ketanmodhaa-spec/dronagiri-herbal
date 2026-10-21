# Pre-Launch QA — Results (automated pass)
**Run:** 21 Oct 2026, by Claude Code against the live site (dronagiriherbal.in), the production database (read-only) and the code at `9c5174f`.
**Checklist:** `dronagiri-prelaunch-qa.md`, with the architect's drift rulings applied.
**Marks:** ✅ Pass · ⚠️ Flagged · ❌ Fail · 🔄 N/A yet / deferred by decision · 👤 needs a human on a real device (see the script in Part 2)

---

## Part 0 — Headline

**The money path is sound.** Server-side prices, signed webhooks, idempotency, stock ledger with zero drift, no secrets in the browser, no account enumeration, rate limits all verified live.

**10 things would surprise us in week one** (ordered by damage):

| # | Finding | Severity | Fix |
|---|---|---|---|
| 1 | **Quiz returns nothing for "Skin".** Code looks for category `'Skin care'`; live category is `'Skin Care'`. Every skin path ends in the empty fallback. | ❌ **Blocker** — live today | Match categories by slug, not display name. Small. |
| 2 | **Backups: 6-hour restore window** (Neon free plan). A mistake noticed next morning is unrecoverable. | ❌ **Blocker** before public launch | Neon paid PITR (7+ days) **or** daily encrypted `pg_dump` → private R2 via a scheduled GitHub Action (no Vercel Pro needed). DISPUTE opened. |
| 3 | **No uptime monitor.** Site down = nobody knows. | ❌ Blocker | UptimeRobot, 10 minutes, owner. |
| 4 | **4 of 10 live products have no photo** (Anti Ageing Orange Pack, Haldi Ubtan, Skin Care Pack, Turmeric Body Butter). | ⚠️ Blocker for launch quality | Sarita uploads photos. |
| 5 | **Privacy Policy dated 23 May** — doesn't cover distributor leads, reviews, Sentry, the cookie banner, WhatsApp order messages, billing addresses or GSTINs now collected at checkout. | ⚠️ Blocker (DPDP) | Lawyer; I can draft. |
| 6 | **WhatsApp delivery receipts can go backwards.** Meta sends `sent`/`delivered`/`read` out of order; a late `sent` overwrites `Delivered` (DH-26-00003 shows "Sent" though the customer screenshotted it). | ⚠️ Misleads the Messages page | Never downgrade a status. Small. |
| 7 | **Paid pay page is a thin receipt** — "Order X is paid — thank you!" only; no items, address or status, until the Day 3 tracking page. | ⚠️ "Where's my order?" gap | Show the order summary + status on the paid state (or ship Day 3 first). Small. |
| 8 | **Sarita isn't told about failed payments or failed refunds** — they're recorded and flagged in admin, but nothing is pushed to her. | ⚠️ | Email/WhatsApp alert on refund failure (urgent) and repeated payment failure. Small. |
| 9 | **No admin order search** (by phone / order number); **no "today" figures or low-stock list on the dashboard**; **per-product stock history not viewable**. | ⚠️ Daily-ops friction | Small each; post-launch acceptable. |
| 10 | **Shop cards don't say "Out of stock"** (the product page does); **footer has no WhatsApp link**. | ⚠️ | Small. |

Plus planned, not surprises: Day 3 tracking page, Day 4 packing slip, invoice go-live after the CA + CMP-04, Vercel Pro for scheduled jobs.

---

## Part 1 — Full results

### A1. Arrival & discovery
| Item | | Note |
|---|---|---|
| Fresh browser loads < 3 s on 4G | ✅ 👤 | Server: home 1.6 s, shop 0.5 s, product 1.0 s total (broadband). 4G figure needs Lighthouse/phone. |
| Deep link from WhatsApp sets guest cookie | ✅ | `dh_guest_session` set on `/products/…` first hit. |
| Invalid URL → branded 404 | ✅ | 404 with site header and "could not be found". |
| Deactivated product URL → 404 | ✅ | Hidden products return 404 (tested 16 Oct with Hide). |
| 380 px — no horizontal scroll | 👤 | |
| 1920 px — not stretched | 👤 | |
| JavaScript disabled — readable | ✅ | Product name, prices, ingredients, how-to-use all in server HTML. |
| 768 px tablet | 👤 | |

### A2. Catalogue browsing
| Item | | Note |
|---|---|---|
| Home grid 8+ with real images | ⚠️ | 4 of 10 products have no photo (leaf placeholder). |
| `/shop` shows all active, no duplicates | ✅ | 10 / 10. |
| Category filters correct | ✅ | Hair care 3 · Skin Care 7 (Toners / Wellness don't exist in production). |
| Switching categories without full reload | ✅ | Client navigation, scroll kept. |
| 0-stock product listed as "Out of stock" | ⚠️ | Turmeric Body Butter is listed, but its **card** has no label; its page does. |
| Prices in ₹, never raw paise | ✅ | No paise visible on any page checked. |
| Card → correct product | ✅ | |
| Back button restores grid scroll | 👤 | |

### A3. Product detail page
| Item | | Note |
|---|---|---|
| Image from R2 CDN | ✅ 👤 | `cdn.dronagiriherbal.in`; visual quality 👤. |
| Tap to zoom / single image / accordions | 👤 | |
| Gujarati toggle / Gujarati fallback | 🔄 | Not live. |
| Stock indicator matches DB | ✅ | Badge from stock vs threshold; 0-stock shows "Out of stock". |
| Qty default 1, +/− work | ✅ | |
| Rapid + taps clamp at the cap | ✅ | Cap is **10** (ruling A3). |
| Only the right number of API calls | ✅ | Quantity is local; one request on Add. |
| Type 99 → clamps with toast · 0 → 1 · "abc" → reverts · huge number → clamps | ✅ 👤 | Digits-only box clamps on blur and toasts why. Worth one human try. |
| Add disabled at 0 stock / while in flight | ✅ | |
| Success feedback | ✅ | Opens the cart drawer (by design) rather than a toast. |
| Stock dropped between view and click → clear message | ✅ | |
| Shared URL leaks no session | ✅ | |

### A4. Cart drawer *(cart is switched off in production; checked in code and on a local production build)*
| Item | | Note |
|---|---|---|
| Badge count, live prices, subtotal, remove, empty state, free-shipping bar and unlocked state | ✅ 👤 | Visual 👤. |
| Price-changed badge only on a real price change | ✅ | Compares against the snapshot, not quantity. |
| Same product twice → one line | ✅ | |
| Over the cap → "Max 10 per product" + bulk link | ✅ | Tested: 10 added, 11th refused; bulk link opens WhatsApp to Sarita (ruling confirmed). |
| Deactivated product in cart → removed with "no longer available" | ✅ | |
| Fresh cart after navigating | ✅ | |
| Full width on mobile, scroll lock, close button, overlay, Escape | ✅ | |
| "Proceed to checkout" works | ✅ | Links to `/checkout`. |

### A5. Session & cart persistence
| Item | | Note |
|---|---|---|
| Survives 7 days; separate per browser/incognito; cleared with cookies; hard refresh | ✅ | Session-scoped by design. |
| Cookie flags | ✅ | Verified live: `HttpOnly; Secure; SameSite=lax; Path=/; Max-Age=604800`. |
| Returning after 20 min refreshes prices | ✅ | Prices are read live every time. |

### A6. Checkout *(tested on a local production build with the cart on, dev database)*
| Item | | Note |
|---|---|---|
| Form loads | ✅ | |
| Names with `.` and `'` | ✅ | No character restrictions. |
| 10-digit mobile, +91 added server-side; rejects 2–5 starts and short numbers | ✅ | |
| PIN must be 6 digits | ✅ | |
| PIN auto-fills city/state | 🔄 | Not built; state is chosen from the GST list (never free text). |
| `#`, `/`, `-`, `,` in addresses | ✅ | |
| Email optional / validation | 🔄 | No email at checkout (ruling A6/A7). |
| Inline errors per field | ✅ | Same schema as the server. |
| Slow 3G — no double submit | ✅ 👤 | Button disables; one-time key makes a retry return the same order (tested). |
| COD | 🔄 | Phase 2. |
| Razorpay success → confirmation | ✅ 👤 | Live UPI payment 19 Oct; test-card run 👤. |
| Razorpay failure → clear error, can retry | ✅ | Order stays payable from the pay page (the cart was emptied at placement; the order holds the items). |
| Modal closed mid-payment → order PENDING, no stock taken | ✅ | Stock moves only on settlement. |
| Confirmation shows number, total, address, tracking link | ⚠️ | Pay page shows "Payment received — order X confirmed" only. See Finding 7. Tracking = Day 3. |
| Token unguessable | ✅ | HMAC-signed, 128-bit. |
| Back button can't resubmit | ✅ | Tested: same submit → identical response, no 2nd order. |
| Tracking link / wrong token | 🔄 | Day 3. (Pay page with a bad token: generic "not valid" ✅.) |
| Terms required; marketing consent saved with time | ✅ | Tested both. |
| **New:** business GSTIN — checksum, billing state = GSTIN state | ✅ | Tested. |
| **New:** changed cart (sold out / low stock) caught at checkout | ✅ | "Something in your cart has changed… review your cart". |
| **New:** 6th checkout in a minute | ✅ | 429. |

### A7. Notifications after order
| Item | | Note |
|---|---|---|
| WhatsApp confirmation at the entered phone | ✅ 👤 | `order_confirmed` wired; all templates delivered live 21 Oct. First real paid order since switch-on = dress rehearsal 👤. |
| Correct order number, amount, product list | ⚠️ | `order_confirmed` (as approved by Meta) carries name, order number and dispatch date — **not** amount or items. Acceptable; a new template version could add them. |
| Tracking link in the message | 🔄 | Shipped message carries the Shiprocket link ✅; our tracking page is Day 3. |
| Email items | 🔄 | WhatsApp-only (ruling). |
| Notification failure never blocks the order | ✅ | Sends run after the response; tested with email deliberately broken. |
| Sarita's alert within 1 minute | ✅ | `new_order_alert` + email copy; delivered to her phone in ~4 s on the live test. |

### A8. Price & promotion correctness
| Item | | Note |
|---|---|---|
| Catalogue = cart = checkout = charged | ✅ | Server prices only; Razorpay asked for exactly the order total (live ₹249 confirmed). |
| Promotions | 🔄 | None yet. |
| Free shipping both ways | ✅ | Free from ₹499, ₹49 below; tested. |
| GST breakdown | 🔄 | GST-inclusive prices; breakdown on the invoice (not yet live). |
| No float artefacts; charged = displayed | ✅ | Integer paise throughout. |

### A9. Legal, trust, contact
| Item | | Note |
|---|---|---|
| Footer links to legal pages, none 404 | ✅ | Privacy, Terms, Refund, Shipping, Contact, Data deletion — all 200. |
| Real content | ✅ ⚠️ | Real, but see the next row. |
| Contact: phone, email, hours, grievance officer | ✅ | 94290 29840, store@, 10 AM–6 PM, grievance officer. |
| "Last updated" recent | ⚠️ | 23 May (data-deletion 25 May). Privacy needs updating — Finding 5. |
| WhatsApp link in footer | ❌ | Footer has no WhatsApp link (Finding 10). |

### Quiz *(added per ruling)*
| Item | | Note |
|---|---|---|
| Recommends for "Hair" | ✅ | 3 hair products. |
| Recommends for "Skin" | ❌ | **Returns nothing** — category name mismatch (Finding 1). "Both" returns hair only. |
| Recommendation fits the answer (e.g. flakes → shampoo, not a toner) | ⚠️ | Picks **by category only** — every hair answer gets the same products; the reason text varies, but can describe a toner as a cleanser. Needs product-to-concern mapping (Sarita's knowledge). |
| Submission captured for analysis | ⚠️ | Only GA4 events (start / complete), and only with cookie consent. Nothing stored on our side. |
| Works for an anonymous visitor | ✅ | No login, no session dependency beyond the normal guest cookie. |
| Mobile-friendly; re-take behaviour; completion rate | 👤 | Completion rate readable in GA4 once traffic exists. |

### Interim receipt *(added per ruling)*
| Item | | Note |
|---|---|---|
| Pay link stays valid ≥ 7 days | ✅ | Signed, no expiry. |
| …for a paid order, shows number, products, address | ⚠️ | Paid state shows the number only (Finding 7). |
| …for an unpaid order | ⚠️ | Unpaid orders lapse after 24 h; the link then says "can no longer be paid — message us". |

### B1. Login & session
| Item | | Note |
|---|---|---|
| Login on mobile | 👤 | |
| Correct login → dashboard | ✅ | In daily use. |
| Unknown email vs wrong password identical | ✅ | Verified live: byte-identical 401. |
| 6th wrong attempt → 429 | ✅ | Verified live. |
| Show-password toggle | ✅ | |
| Remember me | 🔄 | Not needed: 30-day silent refresh. |
| Survives browser close; silent refresh | ✅ | |
| Logout | ✅ 👤 | |
| `/admin/orders` signed out → login | ✅ | |

### B2. Order management
| Item | | Note |
|---|---|---|
| New order appears at once; detail page complete; status changes immediate and recorded | ✅ | Verified on the family orders. |
| List columns (number, name, phone, amount, status, time) | 👤 | |
| Sort | ✅ | Newest first; work queues (To pack / Packed) oldest first, deliberately. |
| Filter by status | ✅ | Tabs; chain is Pending → Confirmed → Packed → Shipped → Delivered (ruling B2). |
| Search by phone / order number | ❌ | Not built (Finding 9). |
| Status change → WhatsApp | ✅ | Shipped verified live on DH-26-00002 / 00003. |
| Shipped requires courier + AWB | ✅ | |
| Delivered → customer message | ✅ | Wired; first live use pending. |
| COD cash collected | 🔄 | Phase 2. |
| No illegal skips; no silent reversal | ✅ | Out-of-order steps refused (409); no backward transitions exist. |
| Packing slip / print view | ❌ | Day 4. |
| IP / user agent | 🔄 | Declined (ruling B2). Admin-action user agent not yet recorded — see DISPUTE. |

### B3. Product management
| Item | | Note |
|---|---|---|
| New product live at once | ✅ | Pages are always live (ruling B3). |
| ₹ → paise; negative refused; > ₹1,00,000 refused; decimals rounded | ✅ | |
| Slug from name; edit-slug warning | ✅ | |
| Slug collision → clear error | ✅ ⚠️ | "A product with this URL slug already exists" — no `-2` suggestion. |
| Upload types/sizes (10 KB–8 MB, PNG, WEBP) | 👤 | Limits: JPEG/PNG/WEBP, 10 MB, re-checked after upload. |
| Rejects PDF, GIF, executables, oversize | ✅ | Wrong type deleted after upload. |
| Upload progress | ⚠️ | "Uploading…" text, no percentage. |
| Abandoned upload → orphan | ⚠️ | Possible; orphan sweep deferred (DISPUTE). |
| Alt text EN + GU; featured → home; hide → gone + 404; low-stock "Only X left" | ✅ | |
| Delete only never-sold products | ✅ | Ruling B3. |

### B4. Stock ledger
| Item | | Note |
|---|---|---|
| Adjustment movement with delta, reason, source, admin id | ✅ | Labels: `ADJUSTMENT/ADMIN_PANEL` (ruling B4; noted in MEMORY.md). |
| To 0 allowed; below 0 refused | ✅ | |
| Opening stock recorded | ✅ | As `ADJUSTMENT` "Opening stock". |
| Order decrements atomically | ✅ | `SALE/WEBHOOK` or `SALE/ORDER` (whichever path confirmed the payment), under a row lock. |
| Cancellation restores | ✅ | `CANCELLATION/ADMIN_PANEL` — seen on DH-26-00001. |
| History per product visible | ⚠️ | Recorded, not shown in admin (Finding 9). |
| **Stock = sum of movements** | ✅ | **Zero drift on all 10 production products.** |
| Concurrent edits | ✅ | `SELECT … FOR UPDATE`. |

### B5. Categories
| Item | | Note |
|---|---|---|
| Create / rename / sort | ✅ | ⚠️ renaming currently breaks the quiz (Finding 1). |
| Deactivate with products | 👤 | Products drop off `/shop` but their pages still open; check the admin warning. |
| Delete blocked | ✅ | No delete exists — deactivate only. |

### B6. Shipping workflow
| Item | | Note |
|---|---|---|
| "Ready to ship" list | ✅ | To pack / Packed tabs. |
| Print labels / slips | ❌ | Day 4 (Shiprocket prints the courier label). |
| Tracking number format checks | ⚠️ | Only "not empty". |
| Shipping charge; threshold configurable | ✅ | `FREE_SHIPPING_THRESHOLD_PAISE` / `SHIPPING_FLAT_FEE_PAISE`. |

### B7. Finance & GST
| Item | | Note |
|---|---|---|
| GST snapshot at order time | ✅ ⚠️ | HSN + rate copied to each order line — but **no product has HSN/rate yet** (CA). |
| Seller GSTIN on invoice; required fields; CGST+SGST intra-state; IGST inter-state | ✅ | Specimen PDFs, incl. a 5% + 18% mixed order and bill-to-ship-to. |
| HSN per product | 👤 | CA. |
| Sequential invoice number | 🔄 | Deferred to invoice go-live. **Correction to the ruling:** Rule 46(b) requires a consecutive series unique within the FY — a new series may start at 00001 mid-year, provided it doesn't clash with any bills already issued this FY. CA to confirm. |
| COD fee | 🔄 | N/A. |
| Credit note on refund | 🔄 | Needed once tax invoices are issued — DISPUTE. |
| Excel export; date range | ✅ | Reports page (13 Oct). |

### B8. Dashboard
| Item | | Note |
|---|---|---|
| To-pack and needs-attention counts | ✅ | |
| Today's orders / revenue; week vs last week | ⚠️ | On the Reports page, not the dashboard. |
| Low-stock highlighted | ⚠️ | Amber in the product list; nothing on the dashboard. |
| COD pending | 🔄 | |
| Fast; phone-readable | ✅ 👤 | Parallel queries. |

### B9. Admin notifications
| Item | | Note |
|---|---|---|
| New order → Sarita's WhatsApp | ✅ | Verified on her phone. |
| 8 AM low stock · 9 PM summary | 🔄 | Templates verified on her phone; scheduling needs **Vercel Pro** (still Hobby — please confirm). |
| Payment failure → Sarita | ⚠️ | Not sent (Finding 8). |
| Refund failure → Sarita | ⚠️ | Flagged in admin only (Finding 8). |
| Admin messages only to Sarita | ✅ | One setting: `OWNER_WHATSAPP_NUMBER`. |

### C1. Races & edge cases
| Item | | Note |
|---|---|---|
| Last unit, two buyers | ✅ | Checkout re-checks; settlement locks rows; a second paid buyer goes to "Needs attention", never oversold. |
| Deactivated during cart | ✅ | Caught at checkout. |
| Price changes during checkout → confirm | ⚠️ | The new price is charged, but the customer sees the new total on the pay page **before** paying. No separate "confirm" step. |
| Promotions | 🔄 | |
| Webhook before browser; webhook 30 min late | ✅ | Live 19 Oct: webhook settled first; replays idempotent. |
| 5 rapid submits | ✅ | One order (one-time key) + rate limit. |

### C2. Security
| Item | | Note |
|---|---|---|
| `/api/admin/*` → 401 | ✅ | 7 endpoints checked live. |
| `/api/cart/*` without cookie | ✅ | By design every visitor gets a session cookie at the edge; cart is 404 while switched off. |
| Webhook signatures, timing-safe; wrong signature → 401 | ✅ | Live. |
| Admin JWT RS256 | ✅ | |
| CORS | ✅ | Removed per ruling (browser default). |
| CSP | ⚠️ | Locks framing, `<base>`, forms, plugins; does **not** restrict scripts (deliberate — needs nonces). |
| HSTS | ✅ | `max-age=63072000`. |
| Rate limits (login, checkout, cart, payment) | ✅ | Login 429 and checkout 429 verified live / locally. |
| No stack traces | ✅ | |
| No sensitive console output | ✅ | Two `console.log` in bundles — Next.js internals, no data. |
| **No secrets in public JS** | ✅ | 17 files / 878 KB scanned for every key pattern. |
| SQL injection / XSS | ✅ | Prisma parameterised; React escapes; JSON-LD escaped. |
| No phone in URLs | ✅ | Signed tokens only. |

### C3. Data integrity
| Item | | Note |
|---|---|---|
| Product with orders can't be deleted | ✅ | Tested. |
| Customer delete keeps orders | ✅ | Database refuses deleting a customer with orders. DPDP erasure is a manual process. |
| Price edit leaves past orders unchanged | ✅ | Tested. |
| Daily backups, 30 days | ❌ | 6-hour window (Finding 2). |
| Restore tested | ❌ 👤 | Never done. |
| Prod / dev separated | ✅ | Separate Neon branches. |

### C4. Mobile reality
| Item | | Note |
|---|---|---|
| Numeric and phone keyboards | ✅ | `inputMode` numeric / tel at checkout and quantity. |
| Email keyboard; date pickers | 🔄 | No email or date fields. |
| Scroll lock | ✅ | |
| Tap targets ≥ 44 px | ✅ ⚠️ | Main buttons 44 px; small buttons are 36 px (admin mostly). |
| Checkout and admin without zooming; no jumping buttons | 👤 | |

### C5. SEO & social
| Item | | Note |
|---|---|---|
| Unique titles and descriptions | ✅ | |
| Open Graph | ✅ ⚠️ | Image, title present; `og:type` is "website" (could be "product"). |
| Product JSON-LD with price, availability | ✅ | Product, Offer (₹299, InStock), BreadcrumbList. |
| sitemap, robots (admin/api disallowed), favicon, helpful 404 | ✅ | |
| GA4 on every page | ✅ 👤 | Only after cookie Accept (by design). Check GA realtime. |
| Search Console | 👤 | |

### C6. Performance
| Item | | Note |
|---|---|---|
| Lighthouse, LCP | 👤 | |
| Font layout shift | ✅ | Self-hosted `next/font`. |
| Images via CDN, lazy, `next/image` | ✅ | |
| JS < 300 KB compressed | ✅ | 263 KB home, 267 KB product page. |

### C7. Monitoring
| Item | | Note |
|---|---|---|
| Sentry capturing in production | ✅ 👤 | Live since 19 Oct; a deliberate test error not yet done. |
| Sentry alerts; Vercel analytics | 👤 | |
| Uptime monitor; downtime alert | ❌ | Finding 3. |
| Neon cold-start retry | ⚠️ | Only the sitemap has a fallback. |
| Rate-limit hits logged | ⚠️ | Not logged. |

### C8. Legal & compliance
| Item | | Note |
|---|---|---|
| Legal pages reviewed | 👤 ⚠️ | Privacy outdated (Finding 5). |
| Shipping timeline; refund window | ✅ 👤 | Dispatch 2–4 business days, delivery 5–10; check the return-shipping and hygiene clauses. |
| Grievance officer | ✅ | |
| DPDP consent at checkout | ✅ | Terms required; marketing unticked, stored with wording and time. |
| Cookie banner | ✅ | GA loads only after Accept. |
| Razorpay live keys | ✅ | |
| Registration numbers in footer | 👤 | KVIC visible; check UDYAM and GST. |

### C9. Stranger walk-through
All 👤 — see Part 2. "Checkout with COD" → **online** checkout (Phase 2 for COD). "Track via the WhatsApp link" → the Shiprocket link until Day 3.

### C10. Deferred — still deferred?
| Item | | Note |
|---|---|---|
| Marketing broadcast · orphan image sweep · WhatsApp RESTOCK · DronaBot · international shipping | ✅ | Confirmed not built. |
| Quiz | — | **Built and live** (see Quiz section). |
| Loyalty | ✅ | Surprise-sample prompt for loyal customers is built. |

### D. Sarita readiness (data side)
| Item | | Note |
|---|---|---|
| Admin password changed from the seed value | ✅ | Checked by hash comparison (nothing printed). One Owner account, last login 20 Oct. |
| Everything else in Part D | 👤 | People and process. |

---

## Part 2 — Human test script (~45 min, two people, two phones)

Do this on **phones**, not the laptop. Use Chrome DevTools only for the 380 / 768 / 1920 checks.

**Before you start:** tell me when, and I'll set up a **test copy of the site with the cart switched on** (dev database, Razorpay test keys) — never the live site. Pay with Razorpay's test card `4100 2800 0000 1007` · CVV 123 · 12/26.

**Phone A — "the stranger" (someone who has never seen the site)**
1. From a WhatsApp link to `/shop`: find a skin product by category. *(Does the filter help? Is anything confusing?)*
2. Add 2 different products. Change one quantity to 12 → note what happens. Remove one.
3. Close the browser, reopen the link → is the cart still there?
4. Check out as an ordinary buyer. Try a wrong PIN and a 9-digit phone first — are the messages clear?
5. Pay. Then close the tab and reopen the pay link from browser history — what does it show?
6. Find the refund policy and Sarita's phone number from any page.
7. Take the quiz for **Hair**, then for **Skin** *(Skin is expected to fail until Finding 1 is fixed)*.

**Phone B — "the business buyer"**
1. Add 1 product; at checkout tap "Buying for your business?" — GSTIN `27AAPFU0939F1ZV`, billing in Pune, delivery in Ahmedabad.
2. Try a Gujarat billing state with that GSTIN → should refuse.
3. Pay with the test card. On the slow-network setting (DevTools → Slow 3G), tap "Continue to payment" twice quickly → one order only.

**Sarita (admin, her phone)**
1. Find both orders in **Orders → Unpaid / To pack**. Pack → ship (courier + AWB) → deliver one.
2. Check **Messages**: each step should show Sent → Delivered.
3. Edit a product price by ₹1 and back. Hide and show a product. Upload a photo from her gallery.
4. Open the order page — can she read everything without zooming?

**Visual checks (laptop, Chrome DevTools device bar)**
- 380 px, 768 px, 1920 px: home, shop, product, cart drawer, checkout — no sideways scrolling, nothing cut off.
- Lighthouse (mobile) on home and one product page: record the scores.
- JavaScript disabled: home and product page readable.

Record each step: ✅ / what confused you / screenshot.

---

## Part 3 — Family orders (Part E #5, data side)

| Order | What happened | Surprises |
|---|---|---|
| DH-26-00001 (₹249, our live test) | Paid by UPI 12:03 IST 19 Oct → settled **by the webhook** in under a minute → cancelled → refund processed by Razorpay in 2½ min → stock back to 20. | None. |
| DH-26-00002 (₹250, Dussehra muhurt) | Created 09:17 IST 20 Oct; **paid 5 h later** (14:15); packed and shipped 21 Oct 11:04 with a test AWB; "shipped" WhatsApp **delivered**. | Paid before WhatsApp was switched on → no "order confirmed" to her and no alert to Sarita. Expected. |
| DH-26-00003 (₹250) | Paid 16 min after creation; packed and shipped 21 Oct 11:06; customer screenshotted the "shipped" message. | Log still says "Sent" → Finding 6. |

All three: shipping waived, Gujarat delivery, single item, complete order history. **Your input needed:** what Sarita and the two families said.

---

## Part 4 — Launch-blocking vs ship-with-workaround

**Must fix before the cart opens publicly**
1. Quiz Skin bug (small — I can fix today).
2. Backups beyond 6 hours (Neon plan or GitHub Action dump).
3. Uptime monitor (owner, 10 min).
4. Photos for the 4 products (Sarita).
5. Privacy Policy update (lawyer; I can draft).
6. Vercel Pro (commercial use) — confirm.
7. Planned build: Day 3 tracking + receipt, Day 4 packing slip, Day 5 dress rehearsal.
8. GST: a bill for every sale — manual Bill of Supply until CMP-04 + CA, then the invoice.

**Ship with a workaround, fix in week one**
WhatsApp status downgrade (6), failed-payment/refund alerts (8), shop-card "Out of stock" + footer WhatsApp (10), admin search / dashboard today / stock history (9), quiz per-concern mapping, CSP for scripts, `og:type` product, Sentry deliberate test.

---

## Part 5 — New DISPUTE.md items
1. Backups: 6-hour PITR — choose Neon paid tier vs daily encrypted dump to R2.
2. Quiz recommends by category only — needs Sarita's product-to-concern mapping.
3. Credit notes required for refunds once tax invoices go live.
4. Invoice series — confirm with the CA that a new series may start at 00001 mid-FY (and doesn't clash with any bills issued so far this FY).
5. Admin audit: record the admin's user agent on order/stock/refund actions (ruling B2 nuance).
