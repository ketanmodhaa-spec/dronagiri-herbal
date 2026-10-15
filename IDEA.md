# IDEA.md — Ideas parked for later

> Ideas worth building, but not yet. Each one says why it waits and what it
> needs first. When one is picked up, move it to AGENDA.md.

---

## WhatsApp business assistant for Sarita
*Parked 15 Oct 2026. Build after checkout is live and there are a few weeks of real orders.*

**What it is.** Sarita asks questions on WhatsApp, from her own phone to the
shop number, and gets plain-language answers from live data. She can tap
"MENU" for a list of common questions or type her own, in English or Gujarati.

> **Sarita:** How much did we sell this week?
> **Bot:** ₹18,450 from 31 orders, up 12% on last week. Hibiscus Shampoo led with 9 units.

**Questions it should answer**
- Sales this week / month / any period, compared with the period before
- Stock position, and how many days each product lasts at its current pace
- Where orders go: by city, state or pincode
- Hot cakes and slow movers: by units, and by how fast sales are rising
- What needs attention: paid but unpacked, unpaid piling up, shipped long ago but not delivered

**How it works**
- The WhatsApp webhook (`/api/webhooks/whatsapp`) receives her message.
- Claude (Anthropic API) gets a small set of **read-only tools** built on the
  existing service layer: `salesSummary(period)` (reuse `lib/reports/report-service`),
  `stockPosition()`, `salesByLocation(period)`, `topProducts(period)`,
  `ordersNeedingAttention()`.
- Claude picks the tool, reads the numbers and replies in plain words.
- "MENU" sends a WhatsApp interactive list message with 8–10 preset questions.

**Proactive nudges** (on the planned morning crons; need Vercel Pro)
- "Hair Protein Pack runs out in about 4 days at this week's pace."
- "3 paid orders not packed for over 24 hours."
- "Rose Toner sales doubled this week. Make a bigger batch?"
- "No sales of Onion Shampoo in 30 days."

**Rules**
- **Owner only:** answers only `OWNER_WHATSAPP_NUMBER` (the same setting the
  new-order alert and the RESTOCK commands use). Everyone else is ignored.
- **Read-only:** it never changes anything. RESTOCK stays a fixed command with
  its two-step confirm, never an AI decision.
- **WhatsApp 24-hour rule:** replies to her messages are free-form within 24
  hours. Nudges she didn't ask for need approved templates (`daily_summary`,
  `restock_alert` already queued; nudge templates to add).

**Needs first:** checkout live · a few weeks of real orders · `OWNER_WHATSAPP_NUMBER`
in Doppler · Anthropic API key · Vercel Pro for crons.

**Effort:** about 2–3 days. Shares plumbing with DronaBot (Claude API) and the
WhatsApp restock commands.

**Reference, not a dependency:** [Wappy](https://github.com/csr1010/wappy-kit)
(MIT, official Cloud API, pre-1.0; reviewed 15 Oct 2026). Not adopted: it brings
its own webhook server (one number allows only one webhook, and ours already
handles consent and owner commands), it expects an always-on machine with local
SQLite (doesn't suit Vercel), and it's too early-stage to hold the shop's token
and customer data. Worth reading for how its `@wappy_ai/whatsapp` package
formats long replies, retries sends, and keeps conversation memory for
follow-up questions.
