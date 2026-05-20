# DISCUSSION.md — Dronagiri Herbal
> Log of key discussions, decisions made, and their rationale.
> Date-stamped entries. Most recent at top.
> Last updated: 15 May 2026

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
