# DISPUTE.md — Dronagiri Herbal
> Open issues, unresolved conflicts, and things to revisit.
> Close entries with resolution when resolved.
> Last updated: 22 May 2026

---

## Open Issues

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

## Closed Issues

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
