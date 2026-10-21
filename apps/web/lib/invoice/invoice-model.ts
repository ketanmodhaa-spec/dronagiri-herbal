/**
 * The tax invoice as data — everything the PDF prints, computed once.
 *
 * `buildInvoice` takes the facts of an issued invoice (seller, buyer, the
 * order's GST-inclusive lines) and derives the place of supply, tax type,
 * per-line tax split and totals. The PDF document only lays this out; it
 * does no arithmetic of its own.
 */
import { indianStateCodeSchema, type IndianStateCode, type PaymentMethod } from '@dronagiri/validators';

import {
  amountInWords,
  apportionByRate,
  computeLine,
  formatRate,
  sumTotals,
  summarizeByRate,
  taxTypeFor,
  type GstRateBps,
  type InvoiceLine,
  type InvoiceLineInput,
  type InvoiceTotals,
  type RateSummary,
  type TaxType,
} from './invoice-math';

/**
 * Which copy this is. GST rules call for goods invoices in triplicate: the
 * original travels to the customer, the duplicate with the courier, and the
 * triplicate stays with the seller.
 */
export type InvoiceCopy = 'ORIGINAL' | 'DUPLICATE' | 'TRIPLICATE';

export const INVOICE_COPY_LABEL: Record<InvoiceCopy, string> = {
  ORIGINAL: 'Original for Recipient',
  DUPLICATE: 'Duplicate for Transporter',
  TRIPLICATE: 'Triplicate for Supplier',
};

/** The seller exactly as registered on the GST certificate. */
export interface InvoiceSeller {
  tradeName: string;
  legalName: string;
  addressLines: string[];
  stateCode: IndianStateCode;
  gstin: string;
  pan: string;
  email: string;
  phone: string;
}

export interface InvoiceParty {
  name: string;
  addressLines: string[];
  stateCode: IndianStateCode;
  phone: string | null;
  /** A business buyer's GSTIN, so they can claim input tax credit. Absent for consumers. */
  gstin?: string | null;
}

export interface InvoicePayment {
  method: PaymentMethod;
  /** Razorpay payment id for online orders; null for cash on delivery. */
  transactionId: string | null;
  paidAt: Date | null;
}

export interface InvoiceInput {
  copy: InvoiceCopy;
  seller: InvoiceSeller;
  invoiceNumber: string;
  invoiceDate: Date;
  orderNumber: string;
  orderDate: Date;
  billTo: InvoiceParty;
  shipTo: InvoiceParty;
  items: InvoiceLineInput[];
  /**
   * GST-inclusive shipping charged on the order; 0 when free. It takes the
   * rate of the goods it delivers — split across rates on a mixed order.
   */
  shippingPaise: number;
  payment: InvoicePayment;
  /** Prints a SPECIMEN watermark — for design previews, never for issued invoices. */
  specimen?: boolean;
}

export interface Invoice extends InvoiceInput {
  /** Where the goods are delivered — decides CGST + SGST versus IGST. */
  placeOfSupply: IndianStateCode;
  taxType: TaxType;
  lines: InvoiceLine[];
  /** Tax grouped by rate — printed as the tax summary, and what the GST return needs. */
  rateSummary: RateSummary[];
  totals: InvoiceTotals;
  totalInWords: string;
}

export const SHIPPING_LINE_DESCRIPTION = 'Shipping Charges';

/** "Shipping Charges", or "Shipping Charges (on 5% items)" when split across rates. */
function shippingLineDescription(rateBps: GstRateBps, split: boolean): string {
  return split ? `${SHIPPING_LINE_DESCRIPTION} (on ${formatRate(rateBps)} items)` : SHIPPING_LINE_DESCRIPTION;
}

/**
 * Place of supply (IGST Act s.10). For a consumer, where the goods are
 * delivered (10(1)(a)). For a business buyer with a GSTIN, the state of that
 * GSTIN (10(1)(b), "bill to – ship to"): the goods may go to their branch or
 * customer elsewhere, but the supply is to the registered buyer. The same
 * rule gives the same answer whenever billing and delivery share a state.
 */
export function placeOfSupplyFor(billTo: InvoiceParty, shipTo: InvoiceParty): IndianStateCode {
  const gstinState = billTo.gstin ? indianStateCodeSchema.safeParse(billTo.gstin.slice(0, 2)) : null;
  return gstinState?.success ? gstinState.data : shipTo.stateCode;
}

export function buildInvoice(input: InvoiceInput): Invoice {
  if (input.items.length === 0) {
    throw new Error(`Invoice ${input.invoiceNumber} has no items.`);
  }

  const placeOfSupply = placeOfSupplyFor(input.billTo, input.shipTo);
  const taxType = taxTypeFor(input.seller.stateCode, placeOfSupply);

  const lines = input.items.map((item) => computeLine(item, taxType));
  const shippingShares = apportionByRate(input.items, input.shippingPaise);
  for (const share of shippingShares) {
    lines.push(
      computeLine(
        {
          description: shippingLineDescription(share.rateBps, shippingShares.length > 1),
          hsnCode: '',
          unitPricePaise: share.amountPaise,
          quantity: 1,
          gstRateBps: share.rateBps,
        },
        taxType,
      ),
    );
  }

  const totals = sumTotals(lines);
  return {
    ...input,
    placeOfSupply,
    taxType,
    lines,
    rateSummary: summarizeByRate(lines),
    totals,
    totalInWords: amountInWords(totals.totalPaise),
  };
}
