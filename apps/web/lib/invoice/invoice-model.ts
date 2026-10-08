/**
 * The tax invoice as data — everything the PDF prints, computed once.
 *
 * `buildInvoice` takes the facts of an issued invoice (seller, buyer, the
 * order's GST-inclusive lines) and derives the place of supply, tax type,
 * per-line tax split and totals. The PDF document only lays this out; it
 * does no arithmetic of its own.
 */
import type { IndianStateCode, PaymentMethod } from '@dronagiri/validators';

import {
  amountInWords,
  computeLine,
  sumTotals,
  taxTypeFor,
  type GstRateBps,
  type InvoiceLine,
  type InvoiceLineInput,
  type InvoiceTotals,
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
  /** GST-inclusive shipping charge, taxed as its own line; null when shipping is free. */
  shipping: { pricePaise: number; gstRateBps: GstRateBps } | null;
  payment: InvoicePayment;
  /** Prints a SPECIMEN watermark — for design previews, never for issued invoices. */
  specimen?: boolean;
}

export interface Invoice extends InvoiceInput {
  /** Where the goods are delivered — decides CGST + SGST versus IGST. */
  placeOfSupply: IndianStateCode;
  taxType: TaxType;
  lines: InvoiceLine[];
  totals: InvoiceTotals;
  totalInWords: string;
}

export const SHIPPING_LINE_DESCRIPTION = 'Shipping Charges';

export function buildInvoice(input: InvoiceInput): Invoice {
  if (input.items.length === 0) {
    throw new Error(`Invoice ${input.invoiceNumber} has no items.`);
  }

  const placeOfSupply = input.shipTo.stateCode;
  const taxType = taxTypeFor(input.seller.stateCode, placeOfSupply);

  const lines = input.items.map((item) => computeLine(item, taxType));
  if (input.shipping && input.shipping.pricePaise > 0) {
    lines.push(
      computeLine(
        {
          description: SHIPPING_LINE_DESCRIPTION,
          hsnCode: '',
          unitPricePaise: input.shipping.pricePaise,
          quantity: 1,
          gstRateBps: input.shipping.gstRateBps,
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
    totals,
    totalInWords: amountInWords(totals.totalPaise),
  };
}
