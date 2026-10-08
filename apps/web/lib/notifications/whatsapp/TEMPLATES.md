# WhatsApp Template Submission Sheet

> Copy-paste source for submitting Dronagiri Herbal's 13 templates in
> **Meta WhatsApp Manager → Message templates → Create template**.
>
> ⚠️ **The `{{n}}` order below is not cosmetic.** It must match the order each
> template's `build()` returns in `templates.ts`. If you reorder the variables
> in Meta, sends render with the wrong values in the wrong slots. Don't edit
> the placeholder order without changing `build()` too.
>
> For every template:
> - **Language:** English → code **`en`** (must match `templates.ts`; do **not**
>   pick "English (US)" — that gives `en_US` and sends fail with *template not found*).
> - Set the **Category** exactly as listed (drives billing + approval rules).
> - Sample values are what you paste into Meta's "Samples" boxes so the
>   template passes review.

---

## 1. `otp_login` — Category: **Authentication**

Authentication templates are special: don't write body text. In Meta, choose
**Authentication**, and Meta auto-generates the copy + a "Copy code" button.
Our code sends the 6-digit code as the single `{{1}}` parameter.

- **Code delivery:** Copy code button
- **Sample for `{{1}}`:** `483920`
- Leave "Add security recommendation" and expiry as you prefer (15 min suggested).

---

## 2. `order_placed` — Category: **Utility**

Variables: `{{1}}` firstName · `{{2}}` orderNumber · `{{3}}` totalRupees · `{{4}}` trackingUrl

```
Hi {{1}}! 🌿 We've received your Dronagiri Herbal order {{2}} for ₹{{3}}.

You can track it anytime here: {{4}}

Thank you for choosing nature's care for your hair & skin.
```

Samples: `Sarita` · `DH-1042` · `598` · `https://dronagiriherbal.in/track/abc123`

---

## 3. `order_confirmed` — Category: **Utility**

Variables: `{{1}}` firstName · `{{2}}` orderNumber · `{{3}}` expectedDispatch

```
Good news, {{1}}! Your order {{2}} is confirmed. ✅

We expect to dispatch it by {{3}}. We'll message you the moment it ships.
```

Samples: `Sarita` · `DH-1042` · `Mon, 30 Jun`

---

## 4. `order_packed` — Category: **Utility**

Variables: `{{1}}` firstName · `{{2}}` orderNumber

```
{{1}}, your order {{2}} is packed and ready for the courier. 📦

It'll be on its way very soon — tracking details to follow.
```

Samples: `Sarita` · `DH-1042`

---

## 5. `order_shipped` — Category: **Utility**

Variables: `{{1}}` firstName · `{{2}}` orderNumber · `{{3}}` courier · `{{4}}` trackingNumber · `{{5}}` trackingUrl

```
On its way, {{1}}! 🚚 Your order {{2}} has shipped via {{3}}.

Tracking number: {{4}}
Track live: {{5}}
```

Samples: `Sarita` · `DH-1042` · `Delhivery` · `DLV9988776655` · `https://dronagiriherbal.in/track/abc123`

---

## 6. `order_delivered` — Category: **Utility**

Variables: `{{1}}` firstName · `{{2}}` orderNumber

```
Delivered! 🎉 {{1}}, your order {{2}} has reached you.

We'd love to hear how you like it. Reply here anytime if anything's not perfect.
```

Samples: `Sarita` · `DH-1042`

---

## 7. `order_cancelled` — Category: **Utility**

Variables: `{{1}}` firstName · `{{2}}` orderNumber · `{{3}}` reason

```
{{1}}, your order {{2}} has been cancelled.

Reason: {{3}}

If this wasn't expected or you need help, just reply to this message.
```

Samples: `Sarita` · `DH-1042` · `Requested by customer`

---

## 8. `refund_initiated` — Category: **Utility**

Variables: `{{1}}` firstName · `{{2}}` orderNumber · `{{3}}` amountRupees

```
{{1}}, we've started your refund of ₹{{3}} for order {{2}}.

It usually reaches your account within 5–7 working days. We'll confirm once it's done.
```

Samples: `Sarita` · `DH-1042` · `598`

---

## 9. `refund_completed` — Category: **Utility**

Variables: `{{1}}` firstName · `{{2}}` orderNumber · `{{3}}` amountRupees

```
Done, {{1}}! ✅ Your refund of ₹{{3}} for order {{2}} has been processed.

It should now reflect in your account. Thank you for your patience.
```

Samples: `Sarita` · `DH-1042` · `598`

---

## 10. `restock_alert` — Category: **Utility** *(recipient: Sarita)*

Variables: `{{1}}` productName · `{{2}}` currentStock · `{{3}}` sku

```
⚠️ Low stock alert

{{1}} (SKU {{3}}) is down to {{2}} units.

Reply RESTOCK {{3}} <qty> to top up.
```

Samples: `Hari Protein Pack` · `4` · `hpp`

---

## 11. `daily_summary` — Category: **Utility** *(recipient: Sarita)*

Variables: `{{1}}` ordersCount · `{{2}}` revenueRupees · `{{3}}` topProduct

```
🌿 Today at Dronagiri Herbal

Orders: {{1}}
Revenue: ₹{{2}}
Top seller: {{3}}

Have a restful evening!
```

Samples: `7` · `4186` · `Hibiscus Shampoo`

---

## 12. `repurchase_nudge` — Category: **Marketing** *(needs marketingConsent)*

Variables: `{{1}}` firstName · `{{2}}` productName

```
Hi {{1}}! 🌿 Running low on your {{2}}?

It's been a while — reorder in a tap and keep your routine going. Reply STOP to opt out.
```

Samples: `Sarita` · `Hibiscus Shampoo`

---

## 13. `winback_nudge` — Category: **Marketing** *(needs marketingConsent)*

Variables: `{{1}}` firstName

```
We miss you, {{1}}! 🌿

Your hair & skin deserve the Sanjivani touch. Come see what's new at Dronagiri Herbal. Reply STOP to opt out.
```

Samples: `Sarita`

---

## After approval

1. Each template flips to **Approved** in WhatsApp Manager (Utility/Auth usually
   minutes–hours; Marketing can take longer).
2. Template **names** above already match `templates.ts` exactly — do not rename.
3. No code change is needed on approval. Sends start working the moment
   `ENABLE_WHATSAPP=true` and the access token + phone-number ID are in Doppler.
