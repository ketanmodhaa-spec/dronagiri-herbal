/**
 * Marketing consent — the one place it is granted or withdrawn.
 *
 * The rules (DPDP Act 2023; Meta's WhatsApp Business policy):
 *   • Off unless the customer actively agrees — an unticked box they tick,
 *     separate from accepting the Terms. Never bundled, never pre-ticked.
 *   • Proof is kept: when, and the exact words they agreed to.
 *   • Withdrawing is as easy as giving: replying STOP on WhatsApp is enough.
 *
 * Transactional messages (order updates, OTPs) never depend on this; only
 * MARKETING templates do, and the WhatsApp send client enforces that.
 */
import { prisma, type DbTransaction } from '@dronagiri/db';

/**
 * The wording beside the checkout checkbox. Stored verbatim with each
 * consent, so change it here (never in the component) to keep the record
 * truthful about what each customer saw.
 */
export const MARKETING_CONSENT_TEXT =
  'Send me offers, new products and refill reminders on WhatsApp. I can reply STOP at any time.';

/** Keywords that withdraw consent, and the one that gives it back. */
const OPT_OUT_KEYWORDS = new Set(['STOP', 'UNSUBSCRIBE', 'STOP ALL', 'OPT OUT', 'OPTOUT']);
const OPT_IN_KEYWORD = 'START';

/** Record consent given at checkout, inside the checkout's transaction. */
export async function recordMarketingConsentInTx(
  tx: DbTransaction,
  customerId: string,
  text: string = MARKETING_CONSENT_TEXT,
): Promise<void> {
  await tx.customer.update({
    where: { id: customerId },
    data: { marketingConsent: true, marketingConsentAt: new Date(), marketingConsentText: text, marketingOptOutAt: null },
  });
}

export type ConsentKeyword = 'OPT_OUT' | 'OPT_IN';

/** Classify an inbound WhatsApp text as a consent keyword, or null. */
export function consentKeyword(messageText: string): ConsentKeyword | null {
  const normalised = messageText.trim().toUpperCase().replace(/[.!]+$/, '');
  if (OPT_OUT_KEYWORDS.has(normalised)) return 'OPT_OUT';
  if (normalised === OPT_IN_KEYWORD) return 'OPT_IN';
  return null;
}

/**
 * Apply a STOP / START sent from a phone. A number that is not a customer is
 * ignored (there is nothing to withdraw). Returns whether a customer changed.
 */
export async function applyConsentKeyword(phone: string, keyword: ConsentKeyword): Promise<boolean> {
  const now = new Date();
  const { count } = await prisma.customer.updateMany({
    where: { phone },
    data:
      keyword === 'OPT_OUT'
        ? { marketingConsent: false, marketingOptOutAt: now }
        : {
            marketingConsent: true,
            marketingConsentAt: now,
            marketingConsentText: 'Replied START on WhatsApp',
            marketingOptOutAt: null,
          },
  });
  return count > 0;
}

/** Whether a customer may be sent MARKETING messages right now. */
export async function hasMarketingConsent(customerId: string): Promise<boolean> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { marketingConsent: true },
  });
  return customer?.marketingConsent === true;
}
