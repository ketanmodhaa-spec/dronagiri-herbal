# CLAUDE.md — Dronagiri Herbal Platform
> This file is read automatically by Claude Code at every session start.
> Keep it updated. It is the single source of truth for AI context.
> Last updated: 25 May 2026

---

## Project Identity

**Client:** Sarita Modha — Solo entrepreneur, Ahmedabad, Gujarat  
**Brand:** Dronagiri Herbal — "Sanjivani for Hair & Skin Care"  
**Domain:** dronagiriherbal.in  
**Registration:** UDYAM-GJ-01-0019327 | KVIC: S0/GJ/KVIC/22/2022 | WHO GMP | Trademark ®  
**Contact:** store@dronagiriherbal.in | +91 94290 29840  

**Architect/PM:** Jaydeep Buch (non-technical, Claude Code primary tool)  
**Deployment partner:** Previous web agency (technical, handles hosting)

---

## Standing Principles

@AGENTS.md

---

## The Three Mandates

Every decision is governed by these, in this order:

1. **Security first** — Customers pay without accounts. Payment integrity is non-negotiable.
2. **Owner-operated** — Sarita must manage everything from her phone. No developer needed for daily ops.
3. **Craft over convenience** — No scaffolded boilerplate. No TODO in shipped code. No copy-paste handlers.

---

## Stack

```
Web:         Next.js 15 (App Router) + React 19 — TypeScript
Mobile:      React Native (Expo managed) — Android first
Database:    PostgreSQL on Neon (serverless)
ORM:         Prisma
Cache:       Upstash Redis (REST API — edge compatible)
Storage:     Cloudflare R2 (product images)
Payments:    Razorpay (UPI + Cards + COD)
WhatsApp:    Meta WhatsApp Business API (direct — both OTP and notifications)
OTP:         Meta WhatsApp Business API (replaces Firebase Phone Auth)
Email:       Resend
AI:          Anthropic Claude API (DronaBot)
Hosting:     Vercel (Hobby until full-store launch → Pro)
Monitoring:  Sentry
Analytics:   GA4 — G-Z0GJEECHZP, owned by store@dronagiriherbal.in (replaced G-W8GDHYY8RT, 22 Oct 2026)
```

---

## Repository Structure

```
dronagiri-herbal/                   ← root (D:/dronagiri-herbal)
├── CLAUDE.md                       ← this file
├── AGENTS.md                       ← standing principles (imported above)
├── MEMORY.md                       ← architectural decisions log
├── AGENDA.md                       ← current tasks and sprint
├── DISCUSSION.md                   ← key discussions log
├── AUDIT.md                        ← security audit log
├── DISPUTE.md                      ← open issues and conflicts
├── vercel.json                     ← cron job config
├── turbo.json                      ← monorepo pipeline
├── package.json
├── .env.local                      ← NEVER commit — in .gitignore
├── .gitignore
│
├── apps/
│   ├── web/                        ← Next.js 14
│   │   ├── app/
│   │   │   ├── (shop)/             ← public storefront
│   │   │   ├── (checkout)/         ← checkout flow
│   │   │   ├── (admin)/            ← admin panel
│   │   │   └── api/                ← API routes
│   │   ├── components/
│   │   │   ├── ui/                 ← design system primitives only
│   │   │   ├── shop/
│   │   │   ├── checkout/
│   │   │   └── admin/
│   │   └── lib/
│   │       ├── auth/               ← JWT, sessions, OTP
│   │       ├── payments/           ← Razorpay
│   │       ├── db/                 ← Prisma client
│   │       └── notifications/      ← WhatsApp, SMS, email
│   │
│   └── mobile/                     ← Expo React Native
│       ├── app/                    ← Expo Router screens
│       ├── components/
│       └── lib/
│
└── packages/
    ├── db/                         ← Prisma schema + migrations + seed
    ├── types/                      ← Shared TypeScript interfaces
    └── validators/                 ← Zod schemas (shared web + mobile)
```

---

## Auth Architecture

```
Guest checkout    → No login. Phone captured at checkout only.
Phone OTP         → Meta WhatsApp Business API. Primary identity for Indian users.
Full account      → Optional. Offered AFTER successful order.
Admin             → bcrypt + RS256 JWT. Separate cookie scope.
```

**Never force login before browsing, cart, or checkout.**  
**Phone OTP is the ONLY verification method for customers.**  
**Email is always optional — never required.**

**Data model — guest checkout still creates a `Customer`.** `Order.customerId` is required: one identity model, no separate guest table. The checkout route must find-or-create a phone-only `Customer` (no `name`/`email`) *before* inserting the `Order`. A "guest" is simply a `Customer` with no account — the optional post-order account just fills in `name`/`email` on that same row.

---

## Brand System

```css
/* Primary greens */
--g900: #1A3D2B   /* headings, deep forest */
--g800: #1F5C3A   /* primary buttons */
--g700: #2D7A50   /* hover states */
--g600: #3A9963   /* borders, accents */
--g100: #D8F0E3   /* subtle backgrounds */
--g50:  #EDF8F2   /* page backgrounds */

/* Gold */
--gold: #C9A84C   /* trust badges, premium */

/* Typography */
--font-display: 'Playfair Display', Georgia, serif
--font-body:    'DM Sans', system-ui, sans-serif
```

---

## Code Rules — STRICTLY ENFORCED

### Banned patterns — reject in code review

```typescript
// ❌ any type
const data: any = ...

// ❌ Non-null assertion without comment
const x = getX()!

// ❌ Empty catch
try { ... } catch { }

// ❌ process.env outside lib/config.ts
const key = process.env.RAZORPAY_KEY

// ❌ Raw Prisma in route handlers
export async function GET() {
  const orders = await db.order.findMany() // use service layer
}

// ❌ Price from client — CRITICAL SECURITY RULE
const total = req.body.total // NEVER trust client price

// ❌ String status comparisons
if (order.status === 'confirmed') // use enum

// ❌ God functions — split if you use "and" in the name
async function validateAndChargeAndNotify() { ... }
```

### Required patterns

```typescript
// ✓ Server-side price verification always
const products = await db.product.findMany({ where: { id: { in: ids } } })

// ✓ Typed errors
throw new PaymentError('Signature verification failed')

// ✓ Service layer for all DB operations
const order = await orderService.findById(id)

// ✓ Zod validation on every API input
const parsed = checkoutRequestSchema.safeParse(body)

// ✓ Money always in paise (integer) — never floats
const total = 29900  // ₹299 in paise
```

---

## Money Handling

```typescript
// ALL monetary values in DB: paise (integer)
// NEVER floating point for money
// ₹299 = 29900 paise

formatPrice(29900) // → "₹299"
paise(299)         // → 29900
rupees(29900)      // → 299
```

---

## API Conventions

```
POST   /api/cart/items              Add item
DELETE /api/cart/items/:productId   Remove item
GET    /api/cart                    Get cart
POST   /api/checkout                Create order
POST   /api/payment/verify          Verify + fulfill
GET    /api/products                Catalog
GET    /api/orders/track            Track by token
POST   /api/admin/auth/login        Admin login
GET    /api/admin/orders            Orders list
```

**Response shape always:**
```json
{ "data": { ... } }           // success
{ "error": { "code": "...", "message": "..." } }  // error
```

---

## Security Rules

1. Guest session JWT — HS256, HttpOnly cookie, 7-day TTL
2. Admin JWT — RS256 asymmetric, 8h access + 30d refresh
3. Razorpay signature — HMAC-SHA256, timing-safe comparison
4. Price ALWAYS fetched server-side before charging
5. Rate limiting on checkout (5/min) and payment (3/5min) endpoints
6. Webhook signature verified before any processing
7. Phone numbers stored as SHA-256 hash (never plaintext in analytics)

---

## Marketing Consent Rule

```
Marketing WhatsApp (repurchase / win-back / offers) only with Customer.marketingConsent.
Consent is OFF by default; set only via recordMarketingConsentInTx (unticked checkbox at checkout).
STOP on WhatsApp withdraws it, START restores it — handled in the WhatsApp webhook.
The send client refuses MARKETING templates without consent — never bypass it.
```

## Notification Rule

```
Order fulfillment NEVER depends on notification success.
Notifications fire non-blocking in background.
All failures logged to NotificationLog.
```

---

## WhatsApp Restock Commands

Sarita manages stock via WhatsApp:
```
RESTOCK hpp 60    → 2-step confirm → atomic DB transaction
STOCK             → full stock levels
STOCK hpp         → single product
ORDERS            → today's summary
HELP              → command list
```

Alias table is in the DB (`ProductAlias` table).  
Print and laminate alias cheatsheet for Sarita's production area.

---

## Cron Schedule (Vercel — UTC times)

```
02:30 UTC (08:00 IST) — stock check alert
03:30 UTC (09:00 IST) — repurchase nudges
04:30 UTC (10:00 IST) — win-back nudges
15:30 UTC (21:00 IST) — daily summary to Sarita
16:00 UTC (21:30 IST) — analytics aggregation
```

---

## Spec Documents (reference these, do not contradict)

| Document | Location | Covers |
|----------|----------|--------|
| Platform Master Spec v1.0 | Previous conversation | Security, auth, JWT, API, DB schema |
| Intelligence & Analytics Spec | Previous conversation | Stock, sales, ABC analysis, nudges |
| WhatsApp Restock Spec | Previous conversation | Full restock command system |
| Communication Flows Spec | Previous conversation | Every SMS/email/WhatsApp template |
| API Keys & .env Setup | Previous conversation | All services, setup steps |
| Deployment Handover | Previous conversation | DNS, Vercel, cron, checklist |

---

## Services Status

| Service | Status | Notes |
|---------|--------|-------|
| Neon PostgreSQL | ✅ Done | `production` branch (`br-sweet-wildflower`) and `dev` branch (`br-long-pine`) both migrated (`20260521062216_init`). Dev is seeded; production intentionally not — real catalogue via admin panel. Pooled URL for runtime, direct for migrations. |
| Upstash Redis | ✅ Done | REST URL + token in Doppler |
| Cloudflare R2 | ✅ Done | Bucket + API token in Doppler |
| Cloudflare DNS | ✅ Done | dronagiriherbal.in zone active. NS migrated from GoDaddy → Cloudflare. DNS records pointing to Vercel. |
| Razorpay | 🟢 Live keys in prd (19 Oct 2026) | KYC done. **prd**: live `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` + `RAZORPAY_WEBHOOK_SECRET`; webhook registered in Razorpay Live mode at `/api/webhooks/razorpay` (events: payment.authorized, payment.captured, payment.failed, order.paid, refund.processed, refund.failed). **dev**: test keys — regenerating a key in Razorpay silently retires the old one, so update Doppler right after. The key id goes to the browser with each payment, not as a `NEXT_PUBLIC_` var. **No public checkout yet** (gated on WhatsApp OTP). Orders are taken via **admin-created orders + pay link** (19 Oct): `/admin/orders/new` → `/pay/<orderId>.<hmac>` → existing verify + webhook settlement. Admin orders at `/admin/orders`: pack / ship / deliver, cancel (auto full refund if paid online), partial refunds (Owner only), ₹0 linked replacements, "Needs attention" queue, lazy 24h expiry of unpaid orders. Refunds are paid from the Razorpay *balance* — one larger than the balance is refused (`invalid request sent`). Shipping: `FREE_SHIPPING_THRESHOLD_PAISE` (49900) + `SHIPPING_FLAT_FEE_PAISE` (4900). |
| Meta WhatsApp Business API | 🟢 Live — outbound ON (21 Oct 2026) | Shop number **+91 6355 124 688** (display name "Dronagiri Herbal"). Phone number ID `1216916138171581`, WhatsApp account `1346230040712730`. Permanent System User token as `META_WHATSAPP_ACCESS_TOKEN`. Webhook `/api/webhooks/whatsapp` (field `messages`, signed with `META_APP_SECRET`) handles STOP/START consent and delivery receipts (log rows move SENT → DELIVERED). **All templates approved** (21 Oct); `restock_alert` and `daily_summary` were approved as Marketing — the code keeps them UTILITY so the customer-consent gate does not block Sarita. Order events send via `lib/notifications/order-notifications.ts` after the response (`runAfterResponse`); Sarita gets `new_order_alert` at `OWNER_WHATSAPP_NUMBER` + email to store@. **`ENABLE_WHATSAPP=true` in prd only** — dev stays off (sends logged as QUEUED). Every send is visible in **/admin/messages**. All 9 templates verified live on 21 Oct (delivered to Jaydeep and Sarita). |
| Resend | ✅ Done | API key in Doppler. Domain verified for dronagiriherbal.in. |
| Anthropic | ⏳ Pending | |
| Sentry | ✅ Configured (19 Oct 2026) | DSN + auth token in Doppler `dev` and `prd` (`NEXT_PUBLIC_SENTRY_DSN` — the code reads only this name). Server errors logged with `console.error` are forwarded (captureConsoleIntegration); uncaught ones via `onRequestError`. It was silently off in production until 19 Oct because the prd→Vercel sync was disabled — see Build & Deploy. |
| Vercel | ✅ Done | Project live (account "dronagiriherbal's projects"). dronagiriherbal.in attached with SSL. Production branch is `dev` — see Build & Deploy. **On Hobby temporarily (8 Oct 2026)** — upgrade to Pro just before the full store goes live (orders, payment, fulfilment). Hobby is non-commercial-use only and limits crons, so `vercel.json` crons stay empty until then. |

---

## Build & Deploy

- **Vercel production branch is `dev`.** Pushing to `dev` deploys to production (`dronagiriherbal.in`); `main` deploys as Preview. Configured under Vercel → Settings → Environments → Production. Merge `dev` → `main` and switch this back if the branch model changes.
- **`packages/db` must keep `postinstall: prisma generate`.** pnpm 10 blocks dependency lifecycle scripts, so `@prisma/client` never self-generates on Vercel — without this the build fails with `product implicitly has an 'any' type`.
- **`app/page.tsx` is `force-dynamic`** — the build never queries the DB, and catalogue changes appear without a redeploy.
- Secrets live in Doppler (`dronagiriherbal-in` → configs `dev` / `stg` / `prd`), synced into Vercel. Store every value **raw — never wrap it in quotes**; Doppler keeps quotes as literal characters and breaks the value.
- **The prd → Vercel sync must use the Config variable type.** The original "Sensitive" sync was disabled by Doppler ("Vercel does not allow one of your secrets to be a Secret variable"), so prd changes silently stopped reaching Vercel. Recreated as Config on 19 Oct 2026. If a prd change does not show up on the site, check Doppler → prd → Config Syncs first. A Doppler change reaches the site only on the next deploy.

---

## Key People

| Person | Role | Contact |
|--------|------|---------|
| Sarita Modha | Business owner | +91 94290 29840 |
| Jaydeep Buch | Architect / PM | — |
| Deployment agency | Hosting + DNS | — |

---

## Today's Date
15 May 2026 — Project build starting.  
Repo created on D: drive.  
Target: Step 1 complete by end of May 2026.
