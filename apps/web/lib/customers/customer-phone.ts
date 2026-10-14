/**
 * Customer phone numbers in one canonical form: E.164 with the plus sign,
 * e.g. `+919876543210` — how `Customer.phone` is stored, so the same person
 * is always the same row whichever surface they arrive from.
 */

/** From the 10-digit form customers type at checkout (validated upstream). */
export function customerPhoneFromIndianMobile(tenDigits: string): string {
  return `+91${tenDigits}`;
}

/**
 * From the sender id on an inbound WhatsApp message — digits with country
 * code, no plus (e.g. `919876543210`). Null for anything that is not a
 * plausible international number.
 */
export function customerPhoneFromWhatsApp(waId: string): string | null {
  const digits = waId.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15 ? `+${digits}` : null;
}
