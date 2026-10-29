# SECURITY-PLAYBOOK — Dronagiri Herbal

What to do when an alarm fires. Five scenarios, each in the same shape:
how you'll notice, the first 15 minutes, then the rest, and when it is over.

Before any of them: **breathe, then write what you do in DISPUTE.md as you
do it** (Blue Book, Part VII).

---

## Switches you can pull

| Switch | Where | Effect |
|---|---|---|
| Change an admin password | `/admin/change-password` | Signs that admin out of every device |
| `NEXT_PUBLIC_ENABLE_CART=false` | Doppler `prd` → redeploy | Cart and checkout disappear; the shop stays browsable |
| `ENABLE_WHATSAPP=false` | Doppler `prd` → redeploy | No outbound WhatsApp; sends are logged as QUEUED |
| `SECURITY_ALARMS_ENABLED=false` | Doppler `prd` → redeploy | Stops alarm emails and login alerts (only if they misfire) |
| Pause the project | Vercel → Settings → General | The whole site goes offline |

A Doppler change reaches the site only on the next deploy: Vercel →
Deployments → latest → **Redeploy**.

---

## 1. Someone else is in the admin panel

**You'll notice:** an admin-login WhatsApp (Sarita) or email (Jaydeep) that
nobody recognises; the alarm *"A stolen admin session was used"*; orders,
prices or products changed that nobody changed.

**First 15 minutes**
1. Sarita changes her password at `/admin/change-password` — every session
   ends, including the intruder's.
2. If a STAFF account was used, the Owner changes or deactivates it too.
3. If you can't sign in at all: Vercel → pause the project, then call Jaydeep.

**Then**
- Check `/admin/orders` and the product list for changes made during the
  intrusion — prices, stock, refunds, cancelled orders.
- Check Razorpay → Refunds for anything not started by Sarita.
- Was the password reused elsewhere? Change it there too.

**Over when:** a fresh password is in place, nothing unexplained remains
in orders, products or refunds.

---

## 2. A secret has leaked

**You'll notice:** a key appears in a Git commit, screenshot, chat or log;
GitHub or a provider emails about an exposed credential; activity on a
provider dashboard nobody made.

**First 15 minutes**
1. Find which service the secret belongs to. Revoke or regenerate it **at
   the provider first** — Razorpay, Meta, Resend, Upstash, R2, Neon.
2. Put the new value in Doppler `prd` (raw, no quotes) and redeploy.
3. If it was `ADMIN_JWT_PRIVATE_KEY` or `GUEST_SESSION_SECRET`, generate a
   new pair — every admin and every shopper is signed out, which is the point.

**Then**
- Check the provider's logs for use of the old key between the leak and the
  rotation.
- If it was committed to Git, rotating is the fix — rewriting history does
  not un-leak it.
- Record the rotation (date, secret, reason). Rotation steps per service
  belong in SECRET-ROTATION.md once written.

**Over when:** the old value no longer works anywhere, and the provider's
logs show no misuse.

---

## 3. Forged payments or webhooks

**You'll notice:** the alarm *"Webhook with a bad signature"* or *"Payment
with a bad signature"*.

**First 15 minutes**
1. Ask: did anyone rotate a Razorpay or Meta secret recently? If yes, the
   new value is probably missing from Doppler `prd` — update it and redeploy.
   Real webhooks start working again; that's the whole fix.
2. If nobody rotated anything, it is forged. No action is needed to block
   it — forged messages are already refused and nothing was fulfilled.

**Then**
- Razorpay dashboard → Payments: compare against `/admin/orders`. Every paid
  order must have a captured payment in Razorpay.
- Repeated forgeries from one address: note it in DISPUTE.md.

**Over when:** real webhooks are arriving (Razorpay → Webhooks shows
successful deliveries) and every paid order matches a Razorpay payment.

---

## 4. Bots flooding the site

**You'll notice:** alarms *"rate-limited requests"* or *"failed bot checks"*;
Better Stack reports the site slow or down; a surge of junk enquiries.

**First 15 minutes**
1. Is the site up? If Better Stack says yes, the defences are holding —
   watch, don't act.
2. If the site is down or crawling: Vercel → Firewall → turn on **Attack
   Challenge Mode**. (Cloudflare "Under Attack" mode only works if the DNS
   records are proxied — orange cloud.)
3. If checkout is the target: `NEXT_PUBLIC_ENABLE_CART=false` and redeploy.

**Then**
- Vercel → Usage: check function invocations — a flood costs money on Pro.
- Delete junk partner enquiries from `/admin/enquiries`.

**Over when:** alarm counts are back to zero for a full hour and Better
Stack shows normal response times.

---

## 5. Customer data may have been exposed

**You'll notice:** any of scenarios 1–2 where the intruder could read orders
(names, phones, addresses); a customer reports someone knowing their order
details; a Neon or Doppler access nobody made.

**First 15 minutes**
1. Contain first: run scenario 1 or 2, whichever applies.
2. Write down what could have been seen, from when to when.

**Then**
- Indian law has short deadlines. Under CERT-In directions a cyber incident
  must be reported within **6 hours** of noticing it (incident@cert-in.org.in).
  Under the DPDP Act a personal-data breach must be reported to the Data
  Protection Board and to each affected customer. **Confirm the current
  rules with a lawyer the same day** — do not wait for certainty about scope.
- Tell affected customers plainly what was exposed and what they should
  watch for (calls pretending to be the shop).
- No card or UPI details are ever stored by us — Razorpay holds them.

**Over when:** the cause is closed, reports are filed, customers are told,
and the lesson is written back into this playbook.

---

*After any incident: add what you learned to the matching scenario above.*
