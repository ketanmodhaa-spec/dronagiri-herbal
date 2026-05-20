# AGENDA.md — Dronagiri Herbal
> Current tasks, sprint, and priorities.
> Update this file at the start and end of every work session.
> Last updated: 15 May 2026 — 8:00 PM IST

---

## Today — 15 May 2026

### In progress right now
- [ ] Create repo on D: drive
- [ ] Install Node.js and Git (verify versions)
- [ ] Initialize monorepo structure
- [ ] Push to GitHub
- [ ] Connect GitHub to Vercel

### Blocked
- 🔶 Firebase Admin SDK — org policy blocks key creation. Developer to handle via REST API workaround.
- ⏳ Razorpay KYC — Sarita to complete independently.

### Completed today
- ✅ Neon PostgreSQL — both URLs in .env
- ✅ Upstash Redis — REST URL + token in .env
- ✅ Cloudflare R2 — bucket + API token in .env
- ✅ Firebase project created — web app registered — Phone Auth enabled
- ✅ Firebase public config in .env
- ✅ All project MD files created (CLAUDE, MEMORY, AGENDA, DISCUSSION, AUDIT, DISPUTE)

---

## This Week (15–21 May 2026)

### Step 1 — Foundation

**Developer tasks:**
- [ ] Monorepo scaffold (turbo + Next.js + Expo)
- [ ] Prisma schema push to Neon
- [ ] Seed database (all 20 products + aliases)
- [ ] Design system — CSS tokens, base components
- [ ] Guest session middleware (JWT + rate limiting)
- [ ] Security headers (next.config.ts)
- [ ] Admin auth (bcrypt + RS256 JWT)

**Sarita tasks:**
- [ ] Product photography (2-3 shots per product, natural light)
- [ ] WhatsApp WATI template texts approval
- [ ] Razorpay KYC completion
- [ ] Confirm real prices for all 20 products (currently all ₹299 — placeholder)

**Pending services:**
- [ ] WATI — get API credentials
- [ ] Resend — signup + domain verify
- [ ] Anthropic — get API key + set spend limit
- [ ] Sentry — setup project

**Domain:**
- [ ] Point dronagiriherbal.com → Vercel (coordinate with deployment agency)
- [ ] Old WordPress → old.dronagiriherbal.com

---

## Next Week (22–28 May 2026)

### Step 2 — Store & Checkout

- [ ] Product catalog pages (ISR)
- [ ] Product detail page (gallery, accordions, Gujarati toggle)
- [ ] Cart system (Redis-backed, server-side prices)
- [ ] Checkout flow (address form + payment selector)
- [ ] Razorpay integration (test mode first)
- [ ] Payment verification (HMAC-SHA256)
- [ ] Order confirmation + tracking page
- [ ] WhatsApp notifications (WATI templates)
- [ ] Admin panel — orders management
- [ ] Hair & skin quiz

---

## June 2026

### Step 3 — Intelligence & AI

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

- Vertex AI Imagen 3 for automatic product photography on new product creation
- Shiprocket integration for automatic tracking updates
- Google Play Console setup ($25 one-time)
- MSG91 as SMS backup for OTP
- Loyalty programme visible balance in app

---

## Definition of Done — Step 1

Step 1 is complete when:
- [ ] dronagiriherbal.com loads the new Next.js homepage
- [ ] All 20 products visible in catalog (with Sarita's photos)
- [ ] Admin can login at /admin/login
- [ ] Guest session cookie set on every page load
- [ ] Security headers verified in browser
- [ ] All environment variables confirmed working
