# Production Preparedness Report — Dronagiri Herbal

> Audit date: 16 Oct 2026 · Branch `dev` @ `4b30202` · Audit only — nothing was changed.
> Auditor: Claude Code. **Note:** Claude Code wrote most of this codebase, so this is partly a review of its own work. A human engineer should review the payment and login code before real money flows.

---

## 1. Verdict

**Is it safe for real users today?** Yes, for browsing. The live site is a catalogue: there is no public checkout yet, so no customer can pay or log in. It is **not** ready to take real orders.

**Blockers before taking orders:** (1) the shop's email address cannot receive mail, (2) errors are invisible because nobody is told when the site crashes, (3) the website framework (Next.js 14) is out of support and has critical security fixes it will never get, (4) the database can only be rewound 6 hours, and (5) GST invoices are not yet produced (already tracked in DISPUTE.md).

**Single most important fix:** make `store@dronagiriherbal.in` receive mail. It is broken *today*. Sarita's lead emails and "customer paid but the order needs attention" alerts go there and are lost. It is also the legally required grievance contact in the Privacy Policy. Fixing it takes about 10 minutes in Cloudflare.

---

## 2. Classification

| Question | Answer | Evidence |
|---|---|---|
| Logins? | **Yes: admin only, for now.** Customers never create passwords. A WhatsApp OTP (one-time code) login is planned. | `app/api/admin/auth/*`, `lib/auth/whatsapp-otp.ts` (built, not yet used by any page) |
| Money? | **Yes.** Razorpay in test mode; refunds; GST invoice designed | `lib/payments/`, `lib/orders/refund-service.ts`, `lib/invoice/` |
| Health data? | **No.** Hair/skin products. The quiz asks about hair/skin type only and stores nothing on the server. | `lib/quiz/` (client-side only) |
| Children's data? | **Unsure, low.** Nothing stops a 16-year-old from ordering, but no age is collected. See section D. | — |
| Vulnerable users / strangers? | **No.** | — |
| Multiple organisations? | **No.** One business, one database. | — |
| AI features? | **Not yet.** DronaBot is planned; no code calls a model. | no `anthropic` imports in `apps/web` |
| Email? | **Yes.** Resend sends owner alerts and lead notifications. | `lib/notifications/email/client.ts` |

Sections that apply: **A, B, H**, plus a short note on D. Sections C, E, F and G are N/A for now. G becomes relevant when DronaBot is built.

---

## 3. Top fixes (ordered by risk to people, then money, then convenience)

### Fix 1: The shop email address can't receive mail · **Effort: small (owner, ~10 min)** · **Broken today**
**What's wrong:** `dronagiriherbal.in` has no MX records. (An MX record is the DNS entry that says where a domain's email should be delivered.) Checked through both Cloudflare and Google DNS: no MX. The old `.com` domain has Google mail; `.in` has none.
**What could happen:** Every email sent to `store@dronagiriherbal.in` bounces. That covers customers using the Contact page, a customer exercising data rights through the Grievance Officer address, Razorpay and Meta, and **the app's own alerts to Sarita**: "a customer paid but stock ran out — please act" (`lib/payments/payment-service.ts:365`) and every distributor lead (`lib/partners/partner-enquiry-service.ts:63`). Both use `ownerInbox` in `lib/config.server.ts:83`. A paying customer could be left waiting with nobody aware.
**Fix:** Cloudflare → dronagiriherbal.in → Email → Email Routing → enable → forward `store@` to Sarita's Gmail. It is free. Then send a test email and submit a test distributor enquiry to confirm both arrive.

### Fix 2: Nobody hears about crashes · **Effort: small**
**What's wrong:** (a) Sentry (an error-alert service) is installed but has no key, so it is switched off. (b) Even once switched on, errors caught inside API routes and webhooks are only printed to the server console, never sent to Sentry (`lib/http.ts:37`, `app/api/webhooks/whatsapp/route.ts:217`). Only a full-page crash reports (`app/global-error.tsx:15`). Code comments that say "Sentry auto-captures" are wrong.
**What could happen:** Checkout or payment confirmation could fail for every customer for days, and the first sign would be an angry phone call.
**Fix:** Owner adds `NEXT_PUBLIC_SENTRY_DSN` + `SENTRY_AUTH_TOKEN` to Doppler. Code: add `Sentry.captureException` in `errorResponse()` and the two webhook catch blocks (3 lines).

### Fix 3: Website framework is out of support with critical security holes · **Effort: medium–large**
**What's wrong:** The site runs Next.js **14.2.35**. The dependency audit (`pnpm audit --prod`) finds 59 issues: **2 critical, 28 high**. Most are in Next.js itself and are fixed only in **15.5.24+**; there is no 14.x patch.
**How bad, honestly:** Vercel runs image resizing on its own service and the site doesn't run on Windows, so the two "remote code execution" criticals are unlikely to apply as written. Most highs are denial-of-service (someone knocking the site offline) and cache-poisoning bugs. This is not an emergency for a catalogue site, but you shouldn't take payments on an unsupported framework.
**Fix:** Upgrade to Next.js 15 on its own branch. Page and route parameters, `cookies()` and `headers()` become async, so many files change. Test every page and the payment flow in test mode before merging. Most of the other flagged packages (postcss, brace-expansion, fast-uri, nanoid…) come along with Next and Sentry and update together.

### Fix 4: The database can only be rewound 6 hours · **Effort: small (owner, paid plan)**
**What's wrong:** Neon project `dronagiriherbal.in` has `history_retention_seconds: 21600`, which is 6 hours of point-in-time recovery (the ability to restore the database to any minute, e.g. just before a bad delete). That's the Free plan limit, and storage is capped at 1 GB.
**What could happen:** If a mistake (a wrong refund batch, a bad migration, a bug that wipes stock) is noticed the next morning, the orders and customer records from before it cannot be brought back.
**Fix:** Before the first real order, move Neon to a paid plan with at least 7 days of history, and turn on scheduled snapshots for the `production` branch. Then do one practice restore (see the checklist below).

### Fix 5: GST tax invoices aren't produced yet · **Effort: medium** · *already tracked*
The invoice maths and PDF are built and correct (CGST+SGST inside Gujarat, IGST elsewhere: `lib/invoice/invoice-math.ts:62`). But nothing uses them yet: products have no HSN code field, there is no invoice-number series, and the shipping line's tax code is blank (`lib/invoice/invoice-model.ts:104`). The facts needed from Sarita's CA are listed in **DISPUTE.md → "GST tax invoice"**. You legally need a tax invoice for each sale once GST-registered.

### Fix 6: Privacy Policy is behind what the site collects · **Effort: small (lawyer + 1 edit)** · *partly tracked*
`content/legal/privacy.md` was last updated 23 May. Since then the site has started collecting:
- distributor enquiries (name, phone, business, GSTIN, investment range) — *already in DISPUTE.md*
- product reviews (reviewer name + text, published publicly)
- error reports to Sentry (once switched on)

The Cookies section says "you can disable cookies in your browser". It should say that Google Analytics loads only after you tap Accept, and that you can change your choice anytime via "Cookie settings" in the footer.
**Risk:** Under the DPDP Act (India's Digital Personal Data Protection Act, 2023) the policy must describe each purpose you collect data for.

### Fix 7: No outside uptime check · **Effort: small (owner, free)**
Nothing pings the live site from outside. Add a free monitor (UptimeRobot or Better Stack) on `https://dronagiriherbal.in`, alerting Sarita's and your phone.

### Fix 8: Small hygiene items · **Effort: small each**
- **No README.** Nothing explains how to run the project, where it's deployed, or which services it needs. If the agency or a new developer takes over, they start blind. (CLAUDE.md covers much of this, but it's written for Claude.)
- **`db:push` script** in `packages/db/package.json` changes the database without a migration file. Remove it so nobody runs it against production by accident.
- **Empty catch** `deleteObject(...).catch(() => {})` in `lib/admin/admin-image-service.ts:101`. A rejected upload that fails to delete is silently left in R2 storage. This also breaks the CLAUDE.md rule against empty catches. Log it.
- **DMARC reports go to GoDaddy** (`rua=mailto:dmarc_rua@onsecureserver.net`), a leftover from before the DNS move. Harmless, but you never see the reports. Point it at your own address or remove `rua`.
- **GitHub repo is on a personal account** (`ketanmodhaa-spec`). See ownership in the checklist.

---

## 4. Full table

### A. Every project

| Item | Status | Evidence | Plain-language risk |
|---|---|---|---|
| No secrets in code or committed `.env` | **Pass** | `.gitignore` covers `.env*`, `env.local.txt`; `env.local.txt` on disk holds only non-secret values (site URL, email-from name) | — |
| No secrets in repo history | **Pass** | Full-history scan for Razorpay, Resend, Anthropic, Meta, AWS, GitHub, Postgres and private-key patterns: only placeholder text (`rzp_live_…`) | No keys need rotating because of the repo |
| Supabase `service_role` key | **N/A** | Project uses Neon + Prisma, not Supabase | — |
| Packages real and maintained | **Pass** | All deps are mainstream (next, prisma, @upstash/*, @aws-sdk/*, jose, bcryptjs, exceljs, @react-pdf/renderer, @sentry/nextjs, react-markdown) | — |
| Dependency audit | **Fail** | `pnpm audit --prod`: 2 critical, 28 high, 26 moderate, 3 low. Mostly Next.js 14 → **Fix 3** | Site could be knocked offline; future exploits won't be patched on 14 |
| Row-level access rules / RLS | **N/A** | No Supabase; the database is reached only from server code with one connection | — |
| "Change an ID in the URL" attack | **Pass** | Cart is keyed to the signed session (`lib/cart/cart-service.ts`); review links are HMAC-signed (`lib/reviews/review-link.ts`); every `/api/admin/*` route calls `requireAdmin`/`requireOwner`; `/dev/pay/*` returns 404 on the live site (checked) | Re-check when order tracking (`/api/orders/track`) is built |
| Server-side input validation | **Pass** | Zod schemas in `packages/validators/src/`, used by every API route | — |
| SQL injection | **Pass** | Prisma queries throughout; the one raw query uses tagged parameters (`lib/orders/order-number.ts`) | — |
| XSS (malicious scripts in fields) | **Pass** | React escapes output; the only raw HTML is JSON-LD with `<` escaped (`lib/seo/json-ld.ts:155`); react-markdown renders without raw HTML | — |
| CSRF (another site acting as you) | **Pass** | Admin and guest cookies are `SameSite=Lax` + HttpOnly (`lib/auth/admin-session.ts:130`); admin actions are JSON POSTs | Revisit when checkout adds customer state changes (already noted in AUDIT.md) |
| File uploads | **Pass** | Admin only; jpeg/png/webp, 10 MB max (`packages/validators/src/image.ts`); re-checked after upload and deleted if wrong (`lib/admin/admin-image-service.ts:100`); stored on R2, not executed | — |
| CORS not "allow all" | **Pass** | No CORS headers set anywhere, so browsers apply same-origin by default | — |
| Login rate-limited | **Pass** | Admin login 5 per 15 min per IP (`lib/ratelimit.ts`) | — |
| Password reset links | **N/A** | No self-service reset exists; a lost admin password is reset with `db:ensure-admin` | Sarita can't recover a forgotten password alone; acceptable for one admin |
| Sessions expire / log out everywhere | **Pass** | Admin: 8h access + rotating refresh with theft detection; changing the password revokes all sessions (AUDIT.md, 22 May) | — |
| `+` emails, Gujarati/Hindi names | **Pass** | Zod email accepts `+`; name fields have no letters-only rule | — |
| Automatic backups / point-in-time recovery | **Fail** | Neon `history_retention_seconds: 21600` (6 h, Free plan) → **Fix 4** | A mistake found next day can't be undone |
| Restore tested | **Unknown** | Can't verify → checklist | — |
| Soft deletes | **Pass** | Products, categories, coupons, aliases use `isActive`; orders are cancelled, never deleted. Only hard delete: product images (`admin-image-service.ts:162`) | — |
| Changes via migration files | **Partial** | 5 migrations in `packages/db/prisma/migrations`; but a `db:push` script exists → Fix 8 | One wrong command could change prod without a record |
| Indexes on searched columns | **Pass** | `@@index` on status, createdAt, customerId, productId etc. in `schema.prisma` | — |
| UTC stored, IST shown | **Pass** | Prisma stores UTC; display uses `timeZone: 'Asia/Kolkata'` (orders, reports, invoices, reviews) | — |
| Error tracking | **Fail** | Sentry DSN unset; API errors not forwarded → **Fix 2** | Silent failures |
| Uptime monitoring | **Unknown** | Nothing in repo → **Fix 7** | Site down unnoticed |
| Logs free of secrets | **Pass** | No log line prints OTPs, tokens, passwords or full phone numbers; OTP stored hashed (AUDIT.md 25 May) | — |
| Loading / empty / error states | **Partial** | API errors return plain messages (`lib/http.ts`); admin shows readable messages (`lib/admin/admin-post.ts`). Not checked screen by screen | — |
| Forms keep input on error | **Pass** | Forms are client-state React; a failed submit doesn't clear fields (e.g. `partner-enquiry-form.tsx`) | — |
| Third-party scripts listed | **Pass** | Only Google Analytics (`googletagmanager.com`). Fonts are self-hosted via `next/font`. Razorpay checkout loads only on payment. Sentry reports through `/monitoring` on your own domain | — |
| Trackers wait for consent | **Pass** | gtag.js isn't even downloaded until Accept (`components/analytics/analytics.tsx:57`); ad signals set to denied | — |
| Reject as easy as Accept; changeable | **Pass** | Decline and Accept side by side; choice remembered; footer "Cookie settings" reopens the banner | — |
| Necessary cookies not blocked | **Pass** | Session/cart cookie set by `middleware.ts` without consent, correctly | — |
| Billing alerts | **Unknown** | → checklist | — |
| No endless paid-API loops | **Pass** | WhatsApp retries once on 5xx only; no crons running | — |
| Accounts in the company's name | **Unknown / Partial** | GitHub: personal account `ketanmodhaa-spec`. Vercel: "dronagiriherbal's projects". Neon org `org-bold-hat-76565149` | If that person's account is lost, so is the code |
| README | **Fail** | None in repo → Fix 8 | Handover is hard |
| Dead code / files over 500 lines | **Partial** | `components/admin/product-form.tsx` 594 lines; `schema.prisma` 708 (fine for a schema). No dead routes found | Minor |
| Privacy policy and terms match the code | **Partial** | Both exist (`content/legal/`); privacy is out of date → **Fix 6** | DPDP non-compliance |

### B. Takes money

| Item | Status | Evidence | Plain-language risk |
|---|---|---|---|
| Amounts in paise (integers) | **Pass** | `*Paise Int` columns; `Number.isSafeInteger` check in `lib/payments/payment-service.ts:111` | — |
| Webhook signature verified | **Pass** | Raw body, HMAC-SHA256, `timingSafeEqual`, 401 on mismatch (`app/api/webhooks/razorpay/route.ts:78-81`, `lib/payments/razorpay-signature.ts:20`) | — |
| No double charge / duplicate order | **Pass** (payment) · **Not built** (checkout) | Order row locked; duplicate events deduplicated; replay returns ALREADY_CONFIRMED (AUDIT.md 13 Oct). `Order.idempotencyKey` exists, but the checkout that uses it isn't built | Re-audit when checkout ships |
| Status set by the server, not the browser | **Pass** | Settlement re-fetches the payment from Razorpay and checks amount/order/currency before confirming | — |
| Price from the server, never the client | **Pass** (payment) · **Not built** (checkout) | Razorpay amount comes from `Order.totalPaise` | Checkout must recompute prices from the DB |
| Checkout rate limit 5/min | **Not built** | No checkout route yet; payment verify is limited 3/5 min | — |
| GST invoices correct | **Fail (not yet built)** | Maths correct; not wired; no HSN or invoice series → **Fix 5** | Can't legally invoice |
| Refunds / failures visible to owner | **Partial** | "Needs attention" queue and refund states in `/admin/orders` ✔. But the email alert goes to a dead inbox → **Fix 1** | Sarita misses urgent orders if she isn't looking at the admin page |

### D. Users possibly under 18
**Low risk, note only.** No age is collected and nothing targets minors, and GA has advertising signals off. If you ever run Instagram-style campaigns aimed at teenagers, revisit: the DPDP Act requires verifiable parental consent for under-18s.

### H. Sends email

| Item | Status | Evidence | Plain-language risk |
|---|---|---|---|
| SPF | **Pass** | `send.dronagiriherbal.in`: `v=spf1 include:amazonses.com ~all` (Resend) | — |
| DKIM | **Pass** | `resend._domainkey.dronagiriherbal.in` present | — |
| DMARC | **Pass** (minor) | `p=quarantine`; reports go to the old GoDaddy address → Fix 8 | — |
| Can receive replies | **Fail** | No MX on `dronagiriherbal.in` → **Fix 1** | Replies and alerts bounce |
| Bounces handled / opt-out | **Partial** | Marketing is WhatsApp-only with STOP/START (signed webhook). Email bounce handling isn't wired; current emails are owner-only, so acceptable for now | — |

---

## 5. Owner's manual checklist

Things only you or Sarita can check. Each takes a few minutes.

1. **Email routing (do first).** Cloudflare dashboard → dronagiriherbal.in → *Email* → *Email Routing* → Enable → add rule `store@dronagiriherbal.in` → Sarita's Gmail. Send an email to it from your phone and confirm it arrives.
2. **Neon plan and backups.** console.neon.tech → project *dronagiriherbal.in* → *Settings*. Before real orders: paid plan, history retention ≥ 7 days, and *Backups/Snapshots* scheduled daily on the `production` branch.
3. **Practise one restore.** In Neon, create a branch of `dev` "as of 1 hour ago". Open it and confirm the data looks right, then delete the test branch. This proves recovery works before you need it.
4. **Billing alerts.** Set spend alerts on Vercel (Settings → Billing), Neon (Billing), Upstash (Usage alerts), Cloudflare (Notifications → Billing), Resend, Meta WhatsApp (Business Manager → Billing, per-conversation charges), Razorpay (settlement notifications) and, later, Anthropic (Console → Limits).
5. **Sentry.** Create the project at sentry.io (org `dronagiriherbalin`), copy the DSN and an auth token into Doppler `prd` as `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_AUTH_TOKEN`, and add Sarita's phone/email to alerts.
6. **Uptime monitor.** UptimeRobot (free) → HTTP monitor on `https://dronagiriherbal.in`, every 5 min, alert to your phone.
7. **Account ownership.** Confirm who controls each of these, and add a second admin (you + Sarita) to each:
   - GitHub repo (`ketanmodhaa-spec`, a personal account)
   - Vercel team
   - Neon org
   - Cloudflare (domain + DNS)
   - Domain registrar (GoDaddy?) with auto-renew on
   - Doppler, Upstash, Resend, Razorpay, Meta Business Manager

   Once a company exists, transfer them to it.
8. **Domain renewal.** Check the expiry date of `dronagiriherbal.in` and `.com` and turn on auto-renew.
9. **Lawyer.** Send the privacy-policy additions in Fix 6.
10. **CA.** The six GST facts in DISPUTE.md → "GST tax invoice".

---

## Status updates
*(Update this column as fixes land.)*

| Fix | Status |
|---|---|
| 1 Email routing | Open — owner |
| 2 Error tracking | Code fixed on `fix/sentry-capture-errors` (16 Oct). Tested: a logged error reaches Sentry, warnings don't; Razorpay logs no longer carry customer phone/email. Owner: add the Sentry DSN + auth token in Doppler |
| 3 Next.js 15 upgrade | Open |
| 4 Neon backups | Open — owner |
| 5 GST invoices | Open — 16 Oct: moving from Composition to Regular (CA files CMP-04, then ITC-01). Other CA facts pending |
| 6 Privacy policy | Open — lawyer |
| 7 Uptime monitor | Open — owner |
| 8 Hygiene items | Fixed on `chore/preparedness-hygiene` (16 Oct): README added, `db:push` removed, failed upload clean-up now logged. Owner: DMARC `rua` address, repo ownership |
