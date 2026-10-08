/**
 * GST arithmetic for a tax invoice.
 *
 * Catalogue prices are GST-inclusive (the price on the pack is what the
 * customer pays), so tax is carved *out* of each price rather than added on
 * top. All arithmetic is in integer paise and is arranged so the invoice
 * always reconciles exactly:
 *
 *   unit taxable × quantity = line taxable
 *   line taxable + line tax = line total = unit price × quantity
 *   Σ line totals           = invoice total = what the customer paid
 *
 * Rounding happens once, on the per-unit taxable value; every other figure is
 * derived from it by multiplication or subtraction, never rounded again.
 *
 * Pure functions only — no I/O — so the numbers can be tested in isolation.
 */
import type { IndianStateCode } from '@dronagiri/validators';

/** A GST rate in basis points: 5% = 500, 18% = 1800. */
export type GstRateBps = number;

export type TaxType = 'CGST_SGST' | 'IGST';

/** One taxable line as the order records it — price GST-inclusive, in paise. */
export interface InvoiceLineInput {
  description: string;
  hsnCode: string;
  unitPricePaise: number;
  quantity: number;
  gstRateBps: GstRateBps;
}

/** One tax component on a line — a single CGST, SGST or IGST row. */
export interface TaxComponent {
  label: 'CGST' | 'SGST' | 'IGST';
  rateBps: GstRateBps;
  amountPaise: number;
}

export interface InvoiceLine {
  description: string;
  hsnCode: string;
  quantity: number;
  unitTaxablePaise: number;
  taxablePaise: number;
  taxes: TaxComponent[];
  taxPaise: number;
  totalPaise: number;
}

export interface InvoiceTotals {
  taxablePaise: number;
  taxPaise: number;
  totalPaise: number;
}

/**
 * Intra-state supply (seller and place of supply in the same state) is taxed
 * CGST + SGST; everything else is IGST.
 */
export function taxTypeFor(sellerState: IndianStateCode, placeOfSupply: IndianStateCode): TaxType {
  return sellerState === placeOfSupply ? 'CGST_SGST' : 'IGST';
}

/** The pre-tax value inside a GST-inclusive amount, rounded to the nearest paisa. */
export function taxableFromInclusive(inclusivePaise: number, rateBps: GstRateBps): number {
  return Math.round((inclusivePaise * 10_000) / (10_000 + rateBps));
}

/**
 * Split a line's tax into its components. CGST and SGST are each half the
 * rate; an odd paisa goes to SGST so the two always sum to the line's tax.
 */
function splitTax(taxPaise: number, rateBps: GstRateBps, taxType: TaxType): TaxComponent[] {
  if (taxType === 'IGST') {
    return [{ label: 'IGST', rateBps, amountPaise: taxPaise }];
  }
  const cgst = Math.floor(taxPaise / 2);
  return [
    { label: 'CGST', rateBps: rateBps / 2, amountPaise: cgst },
    { label: 'SGST', rateBps: rateBps / 2, amountPaise: taxPaise - cgst },
  ];
}

/** Compute one invoice line from its GST-inclusive unit price. */
export function computeLine(input: InvoiceLineInput, taxType: TaxType): InvoiceLine {
  if (!Number.isSafeInteger(input.unitPricePaise) || input.unitPricePaise < 0) {
    throw new Error(`Invalid unit price for "${input.description}": ${input.unitPricePaise}`);
  }
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 1) {
    throw new Error(`Invalid quantity for "${input.description}": ${input.quantity}`);
  }

  const unitTaxablePaise = taxableFromInclusive(input.unitPricePaise, input.gstRateBps);
  const totalPaise = input.unitPricePaise * input.quantity;
  const taxablePaise = unitTaxablePaise * input.quantity;
  const taxPaise = totalPaise - taxablePaise;

  return {
    description: input.description,
    hsnCode: input.hsnCode,
    quantity: input.quantity,
    unitTaxablePaise,
    taxablePaise,
    taxes: splitTax(taxPaise, input.gstRateBps, taxType),
    taxPaise,
    totalPaise,
  };
}

export function sumTotals(lines: InvoiceLine[]): InvoiceTotals {
  return lines.reduce<InvoiceTotals>(
    (acc, line) => ({
      taxablePaise: acc.taxablePaise + line.taxablePaise,
      taxPaise: acc.taxPaise + line.taxPaise,
      totalPaise: acc.totalPaise + line.totalPaise,
    }),
    { taxablePaise: 0, taxPaise: 0, totalPaise: 0 },
  );
}

/** `formatRate(250)` → `"2.5%"`, `formatRate(1800)` → `"18%"`. */
export function formatRate(rateBps: GstRateBps): string {
  return `${rateBps / 100}%`;
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen',
];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

/** Words for 0–99. */
function belowHundred(n: number): string {
  if (n < 20) return ONES[n];
  const ones = n % 10;
  return ones === 0 ? TENS[Math.floor(n / 10)] : `${TENS[Math.floor(n / 10)]}-${ONES[ones]}`;
}

/** Words for 0–999. */
function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const parts: string[] = [];
  if (hundreds > 0) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest > 0) parts.push(belowHundred(rest));
  return parts.join(' ');
}

/** Whole rupees in the Indian system — thousand, lakh, crore. */
function rupeesInWords(n: number): string {
  if (n === 0) return 'Zero';
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1_000);
  const rest = n % 1_000;
  const parts: string[] = [];
  if (crore > 0) parts.push(`${rupeesInWords(crore)} Crore`);
  if (lakh > 0) parts.push(`${belowHundred(lakh)} Lakh`);
  if (thousand > 0) parts.push(`${belowHundred(thousand)} Thousand`);
  if (rest > 0) parts.push(belowThousand(rest));
  return parts.join(' ');
}

/** `amountInWords(59850)` → `"Five Hundred Ninety-Eight Rupees and Fifty Paise Only"`. */
export function amountInWords(paise: number): string {
  if (!Number.isSafeInteger(paise) || paise < 0) {
    throw new Error(`Invalid amount: ${paise}`);
  }
  const rupees = Math.floor(paise / 100);
  const rest = paise % 100;
  const rupeePart = `${rupeesInWords(rupees)} ${rupees === 1 ? 'Rupee' : 'Rupees'}`;
  return rest === 0
    ? `${rupeePart} Only`
    : `${rupeePart} and ${belowHundred(rest)} ${rest === 1 ? 'Paisa' : 'Paise'} Only`;
}
