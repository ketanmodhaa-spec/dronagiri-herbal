# DISPUTE.md — Dronagiri Herbal
> Open issues, unresolved conflicts, and things to revisit.
> Close entries with resolution when resolved.
> Last updated: 15 May 2026

---

## Open Issues

### [OPEN] — Firebase Admin SDK blocked
**Opened:** 15 May 2026  
**Description:** Google Workspace org policy `iam.disableServiceAccountKeyCreation` prevents generating service account key. Needed for server-side OTP verification.  
**Impact:** Server-side Firebase Admin SDK cannot be used as planned.  
**Workaround:** Firebase REST API for token verification — `POST https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=[API_KEY]`  
**Assigned to:** Developer to implement REST API approach  
**Resolution:** ⏳ Open

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
**Opened:** 15 May 2026  
**Description:** dronagiriherbal.com currently points to WordPress (via GoDaddy DNS). Must be migrated to Vercel when new site is ready.  
**Risk:** Brief downtime during DNS propagation (10–30 minutes).  
**Plan:** Old WordPress → old.dronagiriherbal.com first, then point apex to Vercel.  
**Assigned to:** Deployment agency + Jaydeep  
**Resolution:** ⏳ Open — scheduled for end of Step 1

---

### [OPEN] — WATI template approval
**Opened:** 15 May 2026  
**Description:** 13 WhatsApp message templates need to be submitted to WATI for Meta approval. Each takes 24–48 hours.  
**Impact:** No WhatsApp notifications until templates approved.  
**Assigned to:** Developer to write template content → Jaydeep to submit via WATI dashboard  
**Resolution:** ⏳ Open — submit at least 1 week before launch

---

### [OPEN] — Google Search Console verification
**Opened:** 15 May 2026  
**Description:** URL prefix property attempted for dronagiriherbal.com. Domain property showed "Invalid domain" error.  
**Current status:** URL prefix method not yet completed.  
**Next step:** HTML tag method via WordPress header or Next.js layout.tsx  
**Resolution:** ⏳ Open

---

## Closed Issues

*(Move resolved issues here with date and resolution)*

---

## [Template for new entries]

### [STATUS] — Title
**Opened:** DD MMM YYYY  
**Description:**  
**Impact:**  
**Workaround:**  
**Assigned to:**  
**Resolution:** ⏳ Open / ✅ Closed [DD MMM YYYY] — [how it was resolved]
