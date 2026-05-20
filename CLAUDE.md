# CLAUDE.md — Dronagiri Herbal Platform
> This file is read automatically by Claude Code at every session start.
> Keep it updated. It is the single source of truth for AI context.
> Last updated: 15 May 2026

---

## Project Identity

**Client:** Sarita Modha — Solo entrepreneur, Ahmedabad, Gujarat  
**Brand:** Dronagiri Herbal — "Sanjivani for Hair & Skin Care"  
**Domain:** dronagiriherbal.com  
**Registration:** UDYAM-GJ-01-0019327 | KVIC: S0/GJ/KVIC/22/2022 | WHO GMP | Trademark ®  
**Contact:** store@dronagiriherbal.com | +91 94290 29840  

**Architect/PM:** Jaydeep Buch (non-technical, Claude Code primary tool)  
**Deployment partner:** Previous web agency (technical, handles hosting)

---

## The Three Mandates

Every decision is governed by these, in this order:

1. **Security first** — Customers pay without accounts. Payment integrity is non-negotiable.
2. **Owner-operated** — Sarita must manage everything from her phone. No developer needed for daily ops.
3. **Craft over convenience** — No scaffolded boilerplate. No TODO in shipped code. No copy-paste handlers.

---

## Stack

```
Web:         Next.js 14 (App Router) — TypeScript
Mobile:      React Native (Expo managed) — Android first
Database:    PostgreSQL on Neon (serverless)
ORM:         Prisma
Cache:       Upstash Redis (REST API — edge compatible)
Storage:     Cloudflare R2 (product images)
Payments:    Razorpay (UPI + Cards + COD)
WhatsApp:    WATI (Business API)
Email:       Resend
Phone OTP:   Firebase Phone Auth
AI:          Anthropic Claude API (DronaBot)
Hosting:     Vercel (Pro)
Monitoring:  Sentry
Analytics:   GA4 — property G-W8GDHYY8RT (DO NOT recreate)
```

---

## Repository Structure

```
dronagiri-herbal/                   ← root (D:/dronagiri-herbal)
├── CLAUDE.md                       ← this file
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
Phone OTP         → Firebase. Primary identity for Indian users.
Full account      → Optional. Offered AFTER successful order.
Admin             → bcrypt + RS256 JWT. Separate cookie scope.
```

**Never force login before browsing, cart, or checkout.**  
**Phone OTP is the ONLY verification method for customers.**  
**Email is always optional — never required.**

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
| Neon PostgreSQL | ✅ Done | Both URLs in .env |
| Upstash Redis | ✅ Done | REST URL + token in .env |
| Cloudflare R2 | ✅ Done | Bucket + API token in .env |
| Razorpay | ⏳ Pending | Sarita to complete KYC |
| Firebase Phone Auth | 🔶 Partial | Public config done. Admin SDK blocked by org policy |
| WATI | ⏳ Pending | Existing account — get credentials |
| Resend | ⏳ Pending | |
| Anthropic | ⏳ Pending | |
| Sentry | ⏳ Pending | |
| Vercel | ⏳ Pending | Connect after repo push |

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
