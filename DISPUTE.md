# DISPUTE.md — Dronagiri Herbal
> Open issues, unresolved conflicts, and things to revisit.
> Close entries with resolution when resolved.
> Last updated: 20 May 2026

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
