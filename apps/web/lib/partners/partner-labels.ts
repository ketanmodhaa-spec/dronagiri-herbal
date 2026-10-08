/**
 * Human-facing labels for the partner enquiry enums — one place, shared by
 * the public form, the admin lead list and the alert email.
 */
import type {
  PartnerBackground,
  PartnerEnquiryStatus,
  PartnerInvestment,
  PartnerType,
} from '@dronagiri/validators';

export const PARTNER_TYPE_COPY: Record<PartnerType, { label: string; description: string }> = {
  DISTRIBUTOR: {
    label: 'Distributor',
    description: 'Appoint retailers and supply a district or region.',
  },
  STOCKIST: {
    label: 'Stockist',
    description: 'Hold stock locally and supply shops in your area.',
  },
  RETAILER: {
    label: 'Dealer / Retailer',
    description: 'Sell to customers from your shop, pharmacy, salon or parlour.',
  },
  SALES_AGENT: {
    label: 'Sales Agent',
    description: 'Represent the brand locally and bring in orders.',
  },
};

export const PARTNER_BACKGROUND_LABEL: Record<PartnerBackground, string> = {
  NEW_TO_BUSINESS: 'New to business',
  RETAIL_SHOP: 'Retail shop / general store',
  FMCG_DISTRIBUTION: 'FMCG distribution',
  AYURVEDA_OR_COSMETICS: 'Ayurveda / cosmetics trade',
  SALON_OR_PARLOUR: 'Salon / beauty parlour',
  OTHER: 'Other',
};

export const PARTNER_INVESTMENT_LABEL: Record<PartnerInvestment, string> = {
  UNDER_50K: 'Under ₹50,000',
  FROM_50K_TO_2L: '₹50,000 – ₹2 lakh',
  FROM_2L_TO_5L: '₹2 lakh – ₹5 lakh',
  ABOVE_5L: 'Above ₹5 lakh',
};

export const PARTNER_STATUS_LABEL: Record<PartnerEnquiryStatus, string> = {
  NEW: 'New',
  CONTACTED: 'Contacted',
  IN_DISCUSSION: 'In discussion',
  APPOINTED: 'Appointed',
  NOT_SUITABLE: 'Not suitable',
};
