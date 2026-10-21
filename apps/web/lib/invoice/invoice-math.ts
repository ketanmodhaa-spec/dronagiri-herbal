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
  /** The line's full GST rate — what the rate-wise summary groups by. */
  rateBps: GstRateBps;
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
    rateBps: input.gstRateBps,
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

/** One share of an amount, carried at one GST rate. */
export interface RateShare {
  rateBps: GstRateBps;
  amountPaise: number;
}

/**
 * Split an amount across GST rates in proportion to the value of the items
 * at each rate. Used for shipping: delivery charged by the seller is part of
 * the value of the goods (CGST Act s.15(2)(c)), so on a mixed-rate order each
 * rate carries its share. Largest-remainder rounding keeps the shares summing
 * exactly to the amount. One rate in the order → one share, the whole amount.
 */
export function apportionByRate(items: InvoiceLineInput[], amountPaise: number): RateShare[] {
  const valueByRate = new Map<GstRateBps, number>();
  for (const item of items) {
    valueByRate.set(item.gstRateBps, (valueByRate.get(item.gstRateBps) ?? 0) + item.unitPricePaise * item.quantity);
  }
  const totalValue = [...valueByRate.values()].reduce((sum, value) => sum + value, 0);
  const rates = [...valueByRate.keys()].sort((a, b) => a - b);
  if (amountPaise <= 0 || totalValue <= 0) return [];

  const shares = rates.map((rateBps) => {
    const exact = (amountPaise * (valueByRate.get(rateBps) ?? 0)) / totalValue;
    return { rateBps, amountPaise: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let leftover = amountPaise - shares.reduce((sum, share) => sum + share.amountPaise, 0);
  for (const share of [...shares].sort((a, b) => b.remainder - a.remainder)) {
    if (leftover === 0) break;
    share.amountPaise += 1;
    leftover -= 1;
  }
  return shares.filter((share) => share.amountPaise > 0).map(({ rateBps, amountPaise: paise }) => ({
    rateBps,
    amountPaise: paise,
  }));
}

/** The invoice's tax, grouped by rate — the summary GST returns are filed from. */
export interface RateSummary {
  rateBps: GstRateBps;
  taxablePaise: number;
  /** CGST + SGST, or IGST, summed across every line at this rate. */
  taxes: TaxComponent[];
  taxPaise: number;
  totalPaise: number;
}

export function summarizeByRate(lines: InvoiceLine[]): RateSummary[] {
  const byRate = new Map<GstRateBps, RateSummary>();
  for (const line of lines) {
    const summary = byRate.get(line.rateBps) ?? {
      rateBps: line.rateBps,
      taxablePaise: 0,
      taxes: line.taxes.map((tax) => ({ ...tax, amountPaise: 0 })),
      taxPaise: 0,
      totalPaise: 0,
    };
    summary.taxablePaise += line.taxablePaise;
    summary.taxPaise += line.taxPaise;
    summary.totalPaise += line.totalPaise;
    for (const tax of line.taxes) {
      const component = summary.taxes.find((existing) => existing.label === tax.label);
      if (component) component.amountPaise += tax.amountPaise;
    }
    byRate.set(line.rateBps, summary);
  }
  return [...byRate.values()].sort((a, b) => a.rateBps - b.rateBps);
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
