# DISCUSSION.md — Dronagiri Herbal
> Log of key discussions, decisions made, and their rationale.
> Date-stamped entries. Most recent at top.
> Last updated: 20 May 2026

---

## [20 May 2026] — Stack reconciliation + Doppler + Vercel monorepo

**Participants:** Jaydeep Buch + Claude  
**Context:** Resumed after 2-month break. Reviewed env template against populated planning docs; two stack discrepancies surfaced and were resolved.

### Decisions:

**Meta WhatsApp Business API — replaces Firebase Phone Auth and WATI**  
Decision: Single direct integration with Meta WhatsApp Business API for both OTP delivery and notification templates.  
Rationale: Cheaper than running Firebase + WATI in parallel. Single template approval flow with Meta. Eliminates the Firebase Admin SDK org-policy blocker entirely. WATI was a middleware layer over the same Meta API — going direct removes the markup.  
Impact: Firebase entries removed from active stack. WATI account no longer needed. All 13 WhatsApp templates submitted to Meta directly (not via WATI).

**Domain finalised — dronagiriherbal.in**  
Decision: Canonical TLD is `.in`, not `.com`.  
Rationale: [user-supplied]  
Impact: Update all docs (this session). Doppler/Vercel env vars: NEXT_PUBLIC_DOMAIN, EMAIL_FROM, ADMIN_DEFAULT_EMAIL all switch to .in. DNS migration plan in DISPUTE.md updated.

**Doppler for secrets management**  
Decision: Use Doppler instead of `.env` files for all environments (dev, preview, prod).  
Rationale: Single source of truth, automatic sync to Vercel, no risk of committing secrets.  
Impact: Dev commands wrap as `doppler run -- pnpm dev`. Vercel env vars sync from Doppler. env.local.txt retained as a local catalog of variable names; .env.local stays in repo (empty, gitignored) for localhost-only fallbacks until ~25% milestone.

**Vercel monorepo — Root Directory = apps/web**  
Decision: Set Vercel project's Root Directory to `apps/web` (with "Include files outside the root directory" enabled).  
Rationale: Standard pattern for Next.js + Turborepo. Vercel auto-detects Next.js from that path and uses Turborepo for caching. No vercel.json hacks needed.  
Impact: First two Vercel builds failed because Root was still at repo root — fixed by changing this setting.

---

## [15 May 2026] — Project kickoff session

**Participants:** Jaydeep Buch + Claude  
**Context:** Building from scratch on Home PC, D: drive. 8 PM IST.

### Key decisions made today:

**Firebase Admin SDK workaround**  
Google Workspace org policy `iam.disableServiceAccountKeyCreation` blocked key generation. Attempted via Firebase console, Google Cloud IAM, and Workspace Admin — all blocked. Decision: use Firebase REST API for server-side token verification instead. No service account key needed. Developer to implement.

**Repo on D: drive**  
Local development starts on D:/dronagiri-herbal. Connected to GitHub → Vercel for CI/CD.

**Sarita's role in Razorpay**  
Razorpay KYC involves Sarita's personal PAN, GST number, and bank account. Jaydeep will guide her through it separately — she must understand what she owns.

**Product prices**  
All WordPress products currently priced at ₹299 — confirmed as placeholder. Real prices to be confirmed with Sarita before seed data is written.

**Image strategy**  
Decided to use fresh photography from Sarita, not salvage WordPress images. Pomelli (Google Labs) for AI placeholders during build.

---

## [March 2026] — Platform architecture sessions

**Participants:** Jaydeep Buch + Claude (previous conversation)

### Decisions made:

**No WordPress continuation**  
WordPress site examined — Lorem Ipsum in production, broken RevSlider, copyright year showing as literal `[year]`, Add to Cart buttons intentionally hidden via CSS, no real orders flowing through site. Decision: build from scratch on Next.js. WordPress stays at old.dronagiriherbal.com for 90 days.

**Auth model — Amazon style**  
No forced login. Guest checkout captures phone at address step. Account offered after order. Phone OTP via Firebase is primary identity. Email always optional.

**WhatsApp-first communication**  
India context: customers prefer WhatsApp over email. Every notification fires WhatsApp first, SMS as fallback, email if available. No channel blocks the order.

**Sarita's admin — phone only**  
Everything Sarita needs to manage daily must work from her phone. No laptop required. Daily summary, low stock alerts, restock commands — all via WhatsApp.

**Stock management**  
App captures outgoing stock automatically (every fulfilled order). Sarita adds incoming stock manually via WhatsApp command `RESTOCK hpp 60`. Two-step confirmation prevents typos.

**Notification — never blocks order**  
Single most important rule: order fulfillment proceeds even if all notification channels fail. Notifications are a courtesy.

---

## [Template for new entries]

## [DD MMM YYYY] — Topic

**Participants:**  
**Context:**  

### Decisions:

**Topic:**  
Decision made:  
Rationale:  
Impact:  
