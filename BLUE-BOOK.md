# THE BLUE BOOK
## Dronagiri Herbal — Operating Discipline

> This is not documentation. This is the mantra.
> Read it before shipping. Read it when uncertain.
> Follow it when it's inconvenient. Especially then.

**For:** Jaydeep (architect) + Claude Code (implementation)
**Keep in:** repo root
**Review:** quarterly, or when a mistake teaches a new line

---

# PART I — THE THREE MANDATES

Every decision serves these, in this order of precedence. When they
conflict, the lower-numbered one wins.

## 1. Security First

Sarita handles her customers' money, phone numbers, and addresses.
This is a trust she earned over years of handcraft. A breach would
destroy that trust in a single afternoon. Protecting it is not a
feature — it is the floor beneath every feature.

**What this means in practice:**
- Prices come from the server. Always. No exceptions.
- Secrets live in Doppler. Never in Git, never hardcoded, never in logs.
- Admin routes behind `requireAdmin()`. Every single one. No "quick preview."
- Payment integrity verified cryptographically before fulfillment.
- Data minimised. Collect only what the order needs — nothing extra.
- When in doubt, deny. A refused action can be unblocked. A leaked
  secret cannot be unleaked.

## 2. Owner-Operated

Sarita runs this from her phone, between making shampoo and packing
orders. She has no technical team. She never will. Every feature must
be usable by her, alone, on a 380px screen, with one hand holding a
phone and the other holding a jar.

**What this means in practice:**
- Every workflow completable on mobile. Not responsive — mobile-first.
- Admin UI uses words from her world ("Packed", "Shipped") not ours.
- Nothing requires calling Jaydeep to fix.
- Nothing requires a developer to change (prices, products, images,
  stock, promotions, policies).
- When a feature can't meet this bar, it isn't shipped — it's redesigned.

## 3. Craft Over Convenience

The internet is full of templated e-commerce. Sarita's business is not.
Her herbs are hand-blended, her label is her own, her customers come
back because the product respects them. The code must respect her the
same way.

**What this means in practice:**
- No AI slop. No boilerplate copy. No "lorem ipsum" shipped anywhere.
- No TODO comments in production code. Finish it or don't ship it.
- No copy-paste between files. Extract. Reuse. Name it well.
- No god-functions. If "and" belongs in the name, split it.
- Reviews are not optional. Even when the deadline presses.
- The second-order effect ("what breaks when this changes?") is part
  of the first-order decision.

---

# PART II — THE DAILY DISCIPLINE

## Before writing any code

```
1. Does this serve all three mandates?
2. Can it be done simpler?
3. What breaks if this fails silently?
4. Who else touches this surface?
5. Is there a plan? Has it been reviewed?
```

If any answer is unclear → stop. Clarify first.

## Before shipping any code

```
1. Has it been tested with real values, not placeholders?
2. Does it fail cleanly, with a message that helps the user?
3. Has the architect reviewed it, if security-adjacent?
4. Does it log enough to debug a 3 AM problem?
5. Does it log nothing sensitive?
```

If any answer is no → do not ship.

## Before each commit

```
Commit message:  type(scope): short description
                 feat(cart): max 5 per line, server-authoritative
                 fix(auth): PKCS#8 key decoder accepts base64 PEM
                 docs(blue-book): add rotation log convention

Rule: Each commit stands alone. If pulled out, nothing breaks.
Rule: No "WIP" or "misc fixes." If it's work in progress, don't commit.
```

## Before each push to origin/dev

```
Remember: origin/dev deploys to production.
          No staging environment stands in front of it.
          There is no going back.
          Customers see this immediately.

Checklist before push:
  ☐ tsc clean
  ☐ No new ESLint errors
  ☐ Manual verification of the changed path
  ☐ Secrets not in diff
  ☐ Reviewer has signed off (if architecture-adjacent)
```

If any item is unchecked → do not push.

---

# PART III — THE WORKFLOW BETWEEN JAYDEEP AND CLAUDE CODE

The rhythm that has worked across phases must continue:

```
Claude Code  →  drafts the plan
Jaydeep      →  shows the plan to architect (Claude in chat)
Architect    →  approves / flags / rules on open decisions
Claude Code  →  builds against the approved plan
Claude Code  →  tests before pushing
Claude Code  →  pastes the build report back
Architect    →  runs the rubric, triages
Claude Code  →  closes the loop or re-opens as needed
```

**Nothing security-critical skips this.** Not because of bureaucracy —
because every time we've skipped it, something was found later that
should have been caught earlier.

**What qualifies as "security-critical":**
- Anything touching payment, auth, secrets, admin privilege
- Anything touching the money path (prices, totals, stock)
- Anything handling user data (phone, address, email)
- Anything with "webhook" in it
- Anything with "redirect" in it
- Anything that changes a database schema
- Anything that changes a cron schedule

**What doesn't need this:**
- Pure visual tweaks (fonts, spacing, colours within the design system)
- Copy edits (never product copy — that's content, not code)
- Adding a product via admin (that's content work, not code)
- Running existing drill-book procedures (rotation, backup verify)

When in doubt → treat it as security-critical. The cost of over-review
is minutes. The cost of under-review is years.

---

# PART IV — THE DOCUMENTS THAT MUST STAY ALIVE

Each of these lives in the repo. Each has a reason. None is optional.

| File | What it holds | Update when |
|------|---------------|-------------|
| `CLAUDE.md` | AI context for Claude Code sessions | Any structural change |
| `MEMORY.md` | Architectural decisions + rationale | Any decision reversed or made |
| `AGENDA.md` | Current sprint, next up, parking lot | Weekly |
| `DISCUSSION.md` | Key conversations, dated | After every major decision |
| `AUDIT.md` | Security + QA audit history | After every audit pass |
| `DISPUTE.md` | Open issues, blockers, deferred items | As issues open and close |
| `BLUE-BOOK.md` | This file | Quarterly, or when a lesson teaches a line |
| `BACKUPS.md` | Nightly backup + how to restore | When the backup job or storage changes |
| `SECRET-ROTATION.md` | Drill book — how to rotate each secret *(not yet written)* | When a service is added/removed |
| `ROTATION-LOG.md` | Dated log of every rotation performed *(not yet written)* | Every time a secret rotates |
| `SECURITY-PLAYBOOK.md` | Five incident response scenarios *(not yet written)* | After any incident teaches a lesson |

Until the three unwritten files exist, any step below that points to
them falls back to Part VII step 3.

**A document that is never updated is a lie.** Either keep it current
or delete it. Stale docs are worse than missing docs — they mislead.

---

# PART V — THE BANNED PATTERNS

The list lives in one place: **CLAUDE.md → Code Rules**. It is not
copied here, so the two can never disagree.

If any of those patterns slip into a change, the merge is blocked, not
fixed inline. Patterns leak. Catch them at the gate.

---

# PART VI — THE OPERATIONAL RHYTHM

## Daily (silent — no action unless something fires)

- Better Stack monitors ping every 3 min
- Sentry captures any errors silently
- Admin WhatsApp alerts for new orders
- Email alerts if anything fails

**Silence means success.** If the day was quiet, the system is healthy.

## Weekly (20 minutes, Monday morning)

- Open Better Stack → any incidents last week?
- Open Sentry → any new error types?
- Open Vercel Analytics → any pages suddenly slow? *(not yet enabled)*
- Open GA4 → traffic trend, top pages, top source
- Open admin → orders count, revenue, patterns

If all five are clean → close the laptop. The job is done.

## Monthly (60 minutes, first Monday)

- Export last month's order data
- Reconcile stock ledger (one SQL query)
- Review DISPUTE.md — anything to close, anything to escalate?
- Review AGENDA.md — anything to parking lot, anything to prioritise?
- Open conversation with Sarita — what's she noticing?

## Quarterly (half a day)

- Test a backup restore (download, restore to test branch, verify)
- Review this Blue Book — any lines to update?
- Audit secret rotation log — anything overdue?
- Review Sentry alert rules — any new thresholds needed?
- Walk through the SECURITY-PLAYBOOK — still accurate?

---

# PART VII — THE INCIDENT POSTURE

When something breaks in production:

```
1. Breathe. Nothing is on fire that minutes can't contain.
2. Open the SECURITY-PLAYBOOK — find the matching scenario
   (not yet written — go to step 3).
3. If no match → is it containable? → feature flag OFF.
4. If not containable → scale down traffic (Vercel pause).
5. Document what you did, in real time, in DISPUTE.md.
6. Fix the cause, not the symptom.
7. After resolution — write what you learned into the playbook.
```

**The mistake you make in the first hour is less important than the
lesson you keep from the next day.** Every incident teaches a line
that goes into one of these documents.

---

# PART VIII — THE PRINCIPLES THAT APPLY WHEN NO RULE APPLIES

When facing an unfamiliar decision, these guide:

**Prefer boring.** The boring solution breaks less often. Postgres
over NoSQL. REST over GraphQL. Server-rendered over client state.
Boring is a feature.

**Prefer explicit.** Explicit code is read ten times more often than
written. A verbose variable name beats a clever abbreviation. A clear
function beats a one-liner.

**Prefer reversible.** Decisions you can walk back from cost less to
be wrong about. When choosing between a reversible decision and an
irreversible one, prefer reversible even if slightly less optimal.

**Prefer simple over clever.** Clever code is a liability. If the
same thing can be done simply, do it simply. The simplest version is
usually the right version.

**When Sarita's workflow and the perfect code conflict — Sarita wins.**
This project exists for her, not for us. Elegant code that she can't
use is bad code. Rough code that lets her work is good code.

---

# PART IX — THE DEEPER WHY

Why does any of this matter for one Ayurvedic shop in Ahmedabad?

Because Sarita is one person doing honest work. She trusted us to
build something that lets her reach customers without losing her
soul to a template, a platform's commission, or a developer she
can't reach when something breaks.

**Every line of this Blue Book is a promise to her.** Not written,
not signed, but made the day we agreed to build this. Keep it.

The code is secondary. The craft is secondary. The platform is
secondary. The brand is secondary. What matters is: when a customer
in Rajkot taps "Add to cart" on dronagiriherbal.in and gets her
Hair Protein Pack three days later, Sarita's hands made it, Sarita's
reputation delivered it, and nothing between them was fake.

The Blue Book exists so we don't drift from that over time.

---

# PART X — THE SHORT VERSION

If you remember nothing else from this document, remember these ten
lines. The rest is elaboration.

```
1. Security first. Owner-operated. Craft over convenience.
2. Prices from the server. Always.
3. Secrets in Doppler. Never in Git.
4. Admin routes behind requireAdmin(). Every one.
5. Sarita's workflow wins over elegant code.
6. Plan → Review → Build → Test → Ship. In that order.
7. origin/dev is production. Push accordingly.
8. Silence means success. Noise means act.
9. Document what you learn. Every time.
10. Keep the promise to Sarita.
```

---

*Written: 23 October 2026, Ahmedabad*
*By: Jaydeep Buch, in conversation with Claude*
*For: Dronagiri Herbal — and anything else worth building*
*Version: 1.0*

*May be amended. May never be weakened.*
