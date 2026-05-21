# DISPUTE.md — Dronagiri Herbal
> Open issues, unresolved conflicts, and things to revisit.
> Close entries with resolution when resolved.
> Last updated: 21 May 2026

---

## Open Issues

### [OPEN] — Production Neon branch has no schema
**Opened:** 21 May 2026
**Description:** The Neon project has two branches. The init migration (15 tables, commit `2dc02b5`) and the dev seed were applied **only to `br-long-pine`** (endpoint `ep-square-fire`) — a child branch created 21 May. The **primary branch `br-sweet-wildflower`** (endpoint `ep-restless-hill`, created with the project) is empty — no tables. Doppler `dev` points at `br-long-pine` (correct); Doppler `prd` — both `DATABASE_URL` and `DIRECT_URL` — points at the empty primary.
**Impact:** Production has no schema. A prod deploy today would fail every query with `relation does not exist`. CLAUDE.md's `Neon ✅ Done` overstated this — corrected to ⏳ Partial.
**Decision (canonical branch):** The **primary branch `br-sweet-wildflower` is the canonical / production branch** — Neon's primary branch is the long-lived, undeletable root and parent of all child branches, so production belongs there. `br-long-pine` is the standing **dev** branch — keep it, treat as protected (not scratch); recommend renaming it `dev` in the Neon console. Staging gets its own child branch off primary when needed.
**Workaround:** Dev is fully functional on `br-long-pine`; current build work is unaffected.
**Assigned to:** Developer (Claude Code) — execute before launch.
**Resolution:** ⏳ Open — pre-launch blocker. Before launch: (1) run `prisma migrate deploy` against the primary branch's `DIRECT_URL`; (2) do **not** run the dev seed on primary — it is placeholder data (₹299, dev-only); Sarita's real catalogue is entered via the admin panel; (3) optionally rename `br-long-pine` → `dev` in Neon; (4) wire `stg` `DATABASE_URL`/`DIRECT_URL` when staging work begins.

---

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

## Closed Issues

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
