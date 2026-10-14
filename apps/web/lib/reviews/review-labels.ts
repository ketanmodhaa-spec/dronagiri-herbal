/** Plain-language labels for review moderation — safe in client components. */
import type { ReviewRejectReason } from '@dronagiri/db';

export const REJECT_REASON_LABEL: Record<ReviewRejectReason, string> = {
  ABUSIVE: 'Abusive, hateful or obscene language',
  PERSONAL_INFO: 'Contains a phone number, address or other personal details',
  MEDICAL_CLAIM: 'Claims it cured or treated a disease (not allowed on a cosmetics site)',
  SPAM: 'Spam, advertising or links',
  NOT_ABOUT_PRODUCT: 'Not about the product (e.g. only about delivery) — handle it privately',
};
