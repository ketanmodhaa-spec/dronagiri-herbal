# AGENDA.md — Dronagiri Herbal
> Current tasks, sprint, and priorities.
> Update this file at the start and end of every work session.
> Last updated: 20 May 2026

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
- ⏳ Meta WhatsApp templates — 13 templates pending Meta approval (24–48h each).

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
- [ ] Prisma schema push to Neon
- [ ] Seed database (all 20 products + aliases)
- [ ] Design system — CSS tokens, base components
- [ ] Guest session middleware (JWT + rate limiting)
- [ ] Security headers (next.config.ts)
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
- [ ] Razorpay integration (test mode first)
- [ ] Payment verification (HMAC-SHA256)
- [ ] Order confirmation + tracking page
- [ ] WhatsApp notifications (Meta Business API templates)
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
- [ ] dronagiriherbal.in loads the new Next.js homepage
- [ ] All 20 products visible in catalog (with Sarita's photos)
- [ ] Admin can login at /admin/login
- [ ] Guest session cookie set on every page load
- [ ] Security headers verified in browser
- [ ] All environment variables confirmed working
