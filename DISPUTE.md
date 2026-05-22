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

### [OPEN] — Admin image-presign endpoint not rate-limited
**Opened:** 22 May 2026  
**Description:** `POST /api/admin/products/:id/images/presign` sits behind `requireAdmin()` but is not rate-limited. A runaway client loop (bug, not attack) could generate presigned URLs unbounded.  
**Impact:** Low — authenticated-admin only; no data risk, just churn.  
**Workaround:** None needed.  
**Assigned to:** Developer.  
**Resolution:** ⏳ Open — apply the existing Upstash limiter to the presign route with a generous per-admin cap.

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

## [Template for new entries]

### [STATUS] — Title
**Opened:** DD MMM YYYY  
**Description:**  
**Impact:**  
**Workaround:**  
**Assigned to:**  
**Resolution:** ⏳ Open / ✅ Closed [DD MMM YYYY] — [how it was resolved]
