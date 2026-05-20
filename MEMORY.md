# MEMORY.md — Dronagiri Herbal
> Architectural decisions, rationale, and context that must persist.
> Add entries chronologically. Never delete old entries — cross them out if reversed.
> Last updated: 20 May 2026

---

## Decision Log

### [15 May 2026] Repo location
**Decision:** D:/dronagiri-herbal on Home PC  
**Reason:** Developer's primary machine  
**Connected to:** Vercel via GitHub

---

### [15 May 2026] No Neon Auth
**Decision:** Rejected Neon Auth  
**Reason:** Does not support Phone OTP — which is mandatory for Indian users.  
Would require two auth systems running in parallel. Firebase Phone Auth handles OTP natively and is free for 10,000 OTPs/month.

---

### ~~[15 May 2026] Firebase Admin SDK blocked~~ (REVERSED 20 May 2026)
~~**Decision:** Skip Admin SDK key for now — use Firebase REST API~~  
~~**Reason:** Google Workspace org policy `iam.disableServiceAccountKeyCreation` is enforced on dronagiriherbal.com domain. Key creation blocked.~~  
~~**Workaround:** Firebase REST API for server-side OTP verification — no service account key needed.~~  
~~**Revisit:** When developer sets up — they may use Workload Identity Federation as permanent fix.~~  
**Superseded by:** [20 May 2026] Meta WhatsApp Business API replaces Firebase Phone Auth — Firebase is no longer used at all.

---

### [15 May 2026] GA4 property preserved
**Decision:** Use existing G-W8GDHYY8RT — do NOT create new  
**Reason:** Property exists since WordPress launch 2022. Creating new resets domain trust clock.

---

### [15 May 2026] Phone OTP as primary identity
**Decision:** Phone number is the primary customer identity  
**Reason:** Indian users verify phone for everything — banking, UPI, Swiggy, Flipkart. Password creates friction and drop-offs.  
~~**Implementation:** Firebase Phone Auth → OTP → Customer record in DB with phone as unique key.~~  
**Implementation (updated 20 May 2026):** Meta WhatsApp Business API → OTP via WhatsApp message → Customer record in DB with phone as unique key. SMS fallback if WhatsApp delivery fails.

---

### [15 May 2026] Guest checkout — no forced login
**Decision:** Amazon model — checkout without account  
**Flow:** Browse → Cart → Phone + Address at checkout → Order complete → "Create account?" offered AFTER  
**Reason:** Friction before payment = lost sales. Trust is earned by completing the order first.

---

### [15 May 2026] All money in paise
**Decision:** Every monetary value in DB is stored as integer (paise)  
**Reason:** Floating point errors compound with money. ₹299 = 29900 paise. Never a decimal.

---

### [15 May 2026] Razorpay over PayU/CCAvenue
**Decision:** Razorpay as payment gateway  
**Reason:** Best DX in India. Modern SDK. Excellent webhook reliability. Supports all Indian payment methods. COD available.  
**KYC:** Sarita must complete KYC herself — her business, her bank account.

---

### [15 May 2026] WhatsApp restock — command parser, not chatbot
**Decision:** Fixed command parser (not LLM) for restock commands  
**Reason:** LLM adds cost, latency, and ambiguity to a mission-critical inventory operation. Parser is deterministic, free, instantly auditable.  
**Commands:** RESTOCK, STOCK, ORDERS, HELP, CANCEL — nothing else.

---

### [15 May 2026] Notifications never block order
**Decision:** Notifications fire non-blocking — order proceeds regardless  
**Reason:** A WhatsApp/SMS failure must never prevent order fulfillment. Customer has order token on screen.

---

### [15 May 2026] No Shopify
**Decision:** Custom Next.js, not Shopify  
**Reason:** DronaBot AI advisor, WhatsApp restock, cohort analytics, ABC classification, nudge engine — none of these work cleanly on Shopify. Custom build gives full control. Long-term cost is lower.

---

### [15 May 2026] Image strategy
**Decision:** Fresh photography from Sarita — not salvaged from WordPress  
**Reason:** Old WordPress images had no art direction. New site has specific visual identity. Pomelli (Google Labs) for AI-generated placeholders during build.  
**Pomelli prompt:** "Dronagiriherbal product photoshoot, 100% natural Ayurvedic herbal hair and skin care, forest green and warm gold brand palette..."

---

### [15 May 2026] Deployment model
**Decision:** Jaydeep builds → hands codebase to previous web agency for deployment  
**Reason:** Agency is technical and handles hosting. Jaydeep focuses on product quality.  
**Handover:** Complete HANDOVER.md exists with step-by-step deployment guide.

---

### [20 May 2026] Meta WhatsApp Business API — replaces Firebase + WATI
**Decision:** Single integration with Meta WhatsApp Business API directly. Drops Firebase Phone Auth and WATI.  
**Reason:** One service for both OTP delivery and notification templates. Cheaper than Firebase + WATI combined. No Firebase Admin SDK org-policy workaround needed. Single template approval flow with Meta.  
**Implementation:** OTP delivered via WhatsApp message → user enters code → server verifies via Meta API → session created. Notifications use same Meta Business API with approved templates.  
**Env vars (in turbo.json globalEnv):** META_APP_ID, META_APP_SECRET, META_WHATSAPP_PHONE_NUMBER_ID, META_WHATSAPP_BUSINESS_ACCOUNT_ID, META_WHATSAPP_ACCESS_TOKEN, META_WHATSAPP_WEBHOOK_VERIFY_TOKEN.

---

### [20 May 2026] Domain finalised — dronagiriherbal.in
**Decision:** Canonical domain is **dronagiriherbal.in** (not .com).  
**Reason:** Locked in by Jaydeep. Earlier doc references to .com are stale.  
**Impact:** Update all hardcoded references, Vercel domain config, Doppler env vars (NEXT_PUBLIC_DOMAIN, EMAIL_FROM, ADMIN_DEFAULT_EMAIL), Google Search Console verification, GA4 property domain.  
**Open question:** Old WordPress currently lives at dronagiriherbal.com — should it migrate to old.dronagiriherbal.in or stay on .com permanently? (Tracked in DISPUTE.md DNS migration entry.)

---

## Service Credentials Reference
*(Values are in .env.local — this is just a checklist)*

| Service | Key names | Status |
|---------|-----------|--------|
| Neon | DATABASE_URL, DIRECT_URL | ✅ |
| Upstash | UPSTASH_REDIS_REST_URL, TOKEN | ✅ |
| Cloudflare R2 | R2_KEY_ID, R2_SECRET, R2_ACCOUNT_ID | ✅ |
| Razorpay | KEY_ID, KEY_SECRET, WEBHOOK_SECRET | ⏳ |
| ~~Firebase~~ | ~~5 public + 3 admin SDK keys~~ | ❌ Dropped 20 May — replaced by Meta |
| ~~WATI~~ | ~~API_URL, TOKEN, WEBHOOK_SECRET~~ | ❌ Dropped 20 May — replaced by Meta |
| Meta WhatsApp BA | APP_ID, APP_SECRET, PHONE_NUMBER_ID, BUSINESS_ACCOUNT_ID, ACCESS_TOKEN, WEBHOOK_VERIFY_TOKEN | ⏳ |
| Resend | API_KEY | ⏳ |
| Anthropic | API_KEY | ⏳ |
| Sentry | DSN, AUTH_TOKEN | ⏳ |

---

## Product Alias Cheatsheet
*(For Sarita's WhatsApp restock commands)*

| Alias | Product |
|-------|---------|
| hpp | Hair Protein Pack |
| hppp | Hair Protein Pack Premium |
| bhc | Black Herbal Hair Care |
| hho | Protein Herbal Hair Oil |
| scp | Skin Care Pack |
| scpp | Skin Care Pack Premium |
| aao | Anti Ageing Orange Pack |
| tbb | Turmeric Body Butter |
| avt | Aloe Vera Hydra Toner |
| lvt | Lavender Hydra Toner |
| rst | Rose Hydra Toner |
| ttt | Tea Tree Hydra Toner |
| cws | Coffee Walnut Scrub |
| oco | Organic Coconut Oil |
| hub | Haldi Ubtan |
| avg | Aloe Vera Gel |
