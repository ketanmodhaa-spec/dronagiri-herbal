/**
 * The tax invoice PDF — one A4 document that serves every channel: the
 * WhatsApp document message, the email attachment, the customer's download
 * and the paper copy packed with the parcel.
 *
 * Laid out on the familiar Amazon pattern — seller and addresses up top, a
 * ruled item table with per-line tax rows, totals in figures and words, a
 * signatory block — in small type and thin black rules so it prints cleanly
 * in black and white. The logo is the only colour.
 *
 * Pure layout: every figure arrives pre-computed on `Invoice`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Document, Font, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';
import { stateName } from '@dronagiri/validators';

import { formatPriceExact } from '@/lib/format';

import { formatRate } from './invoice-math';
import { INVOICE_COPY_LABEL, type Invoice, type InvoiceParty } from './invoice-model';

/*
 * Assets are read into memory and handed to react-pdf as data, not paths:
 * react-pdf treats a Windows path (`D:\…`) as a URL and tries to fetch it.
 * Data works the same in local dev and on Vercel.
 */
const ASSET_DIR = path.join(process.cwd(), 'lib', 'invoice', 'assets');

function fontDataUrl(file: string): string {
  return `data:font/ttf;base64,${readFileSync(path.join(ASSET_DIR, file)).toString('base64')}`;
}

Font.register({
  family: 'DM Sans',
  fonts: [
    { src: fontDataUrl('DMSans-Regular.ttf'), fontWeight: 400 },
    { src: fontDataUrl('DMSans-Bold.ttf'), fontWeight: 700 },
  ],
});
// Never hyphenate — a split GSTIN, order number or amount is worse than a wrap.
Font.registerHyphenationCallback((word) => [word]);

const LOGO = { data: readFileSync(path.join(ASSET_DIR, 'logo.jpg')), format: 'jpg' as const };

const RULE = 0.5;
const INK = '#000000';
const MUTED = '#4A4A4A';
const HEAD_FILL = '#E6E6E6';

/** Item-table column widths in points; they sum to the A4 content width (539pt). */
const COL = {
  sl: 18,
  description: 195,
  unitPrice: 52,
  qty: 26,
  net: 56,
  rate: 36,
  type: 38,
  taxAmount: 56,
  total: 62,
} as const;

const styles = StyleSheet.create({
  page: {
    paddingTop: 26,
    paddingBottom: 30,
    paddingHorizontal: 28,
    fontFamily: 'DM Sans',
    fontSize: 7.5,
    lineHeight: 1.3,
    color: INK,
  },
  watermark: {
    position: 'absolute',
    top: 360,
    left: 70,
    fontSize: 96,
    fontWeight: 700,
    color: '#000000',
    opacity: 0.06,
    transform: 'rotate(-35deg)',
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  logo: { width: 108, height: 58, objectFit: 'contain' },
  titleBlock: { alignItems: 'flex-end', paddingTop: 6 },
  title: { fontSize: 10, fontWeight: 700 },
  copyLabel: { fontSize: 7.5, color: MUTED, marginTop: 4 },
  twoCol: { flexDirection: 'row', marginTop: 12 },
  colLeft: { width: '50%', paddingRight: 16 },
  colRight: { width: '50%', alignItems: 'flex-end' },
  rightText: { textAlign: 'right' },
  label: { fontWeight: 700 },
  block: { marginBottom: 7 },
  table: { marginTop: 10, borderTopWidth: RULE, borderLeftWidth: RULE, borderColor: INK },
  row: { flexDirection: 'row', borderBottomWidth: RULE, borderColor: INK },
  headRow: { backgroundColor: HEAD_FILL },
  cell: { borderRightWidth: RULE, borderColor: INK, paddingVertical: 3, paddingHorizontal: 3 },
  num: { textAlign: 'right' },
  center: { textAlign: 'center' },
  bold: { fontWeight: 700 },
  taxBlock: { flexDirection: 'column' },
  taxRow: { flexDirection: 'row', flexGrow: 1 },
  taxRowDivider: { borderBottomWidth: RULE, borderColor: INK },
  hsn: { color: MUTED, marginTop: 1 },
  wordsCell: { borderRightWidth: RULE, borderColor: INK, paddingVertical: 4, paddingHorizontal: 4, width: '100%' },
  signRow: { borderRightWidth: RULE, borderColor: INK, paddingVertical: 5, paddingHorizontal: 6, width: '100%', alignItems: 'flex-end' },
  signSpace: { height: 26 },
  note: { marginTop: 6 },
  paymentTable: { marginTop: 10, borderTopWidth: RULE, borderLeftWidth: RULE, borderColor: INK },
  footer: { position: 'absolute', bottom: 16, left: 28, right: 28, fontSize: 6.5, color: MUTED, textAlign: 'center' },
});

const dateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const timeFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Kolkata',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
});

/** `08.10.2026` — the dotted date Indian tax invoices use, in IST. */
function formatDate(date: Date): string {
  return dateFormatter.format(date).replace(/\//g, '.');
}

function formatDateTime(date: Date): string {
  return `${formatDate(date)}, ${timeFormatter.format(date)}`;
}

function PartyBlock({ heading, party, align }: { heading: string; party: InvoiceParty; align: 'left' | 'right' }) {
  const textStyle = align === 'right' ? styles.rightText : undefined;
  return (
    <View style={styles.block}>
      <Text style={[styles.label, textStyle ?? {}]}>{heading}</Text>
      <Text style={textStyle}>{party.name}</Text>
      {party.addressLines.map((line) => (
        <Text key={line} style={textStyle}>
          {line}
        </Text>
      ))}
      {party.phone ? <Text style={textStyle}>Phone: {party.phone}</Text> : null}
      <Text style={textStyle}>
        <Text style={styles.label}>State/UT Code: </Text>
        {party.stateCode}
      </Text>
    </View>
  );
}

function LabelledLine({ label, value, align }: { label: string; value: string; align?: 'right' }) {
  return (
    <Text style={align === 'right' ? styles.rightText : undefined}>
      <Text style={styles.label}>{label} </Text>
      {value}
    </Text>
  );
}

function ItemTable({ invoice }: { invoice: Invoice }) {
  const leadWidth = COL.sl + COL.description + COL.unitPrice + COL.qty + COL.net + COL.rate + COL.type;
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headRow, styles.bold]} fixed>
        <Text style={[styles.cell, styles.center, { width: COL.sl }]}>Sl. No</Text>
        <Text style={[styles.cell, { width: COL.description }]}>Description</Text>
        <Text style={[styles.cell, styles.num, { width: COL.unitPrice }]}>Unit Price</Text>
        <Text style={[styles.cell, styles.center, { width: COL.qty }]}>Qty</Text>
        <Text style={[styles.cell, styles.num, { width: COL.net }]}>Net Amount</Text>
        <Text style={[styles.cell, styles.center, { width: COL.rate }]}>Tax Rate</Text>
        <Text style={[styles.cell, styles.center, { width: COL.type }]}>Tax Type</Text>
        <Text style={[styles.cell, styles.num, { width: COL.taxAmount }]}>Tax Amount</Text>
        <Text style={[styles.cell, styles.num, { width: COL.total }]}>Total Amount</Text>
      </View>

      {invoice.lines.map((line, index) => (
        <View key={`${index}-${line.description}`} style={styles.row} wrap={false}>
          <Text style={[styles.cell, styles.center, { width: COL.sl }]}>{index + 1}</Text>
          <View style={[styles.cell, { width: COL.description }]}>
            <Text>{line.description}</Text>
            {line.hsnCode ? <Text style={styles.hsn}>HSN: {line.hsnCode}</Text> : null}
          </View>
          <Text style={[styles.cell, styles.num, { width: COL.unitPrice }]}>
            {formatPriceExact(line.unitTaxablePaise)}
          </Text>
          <Text style={[styles.cell, styles.center, { width: COL.qty }]}>{line.quantity}</Text>
          <Text style={[styles.cell, styles.num, { width: COL.net }]}>{formatPriceExact(line.taxablePaise)}</Text>
          <View style={[styles.taxBlock, { width: COL.rate + COL.type + COL.taxAmount }]}>
            {line.taxes.map((tax, taxIndex) => (
              <View
                key={tax.label}
                style={[styles.taxRow, taxIndex < line.taxes.length - 1 ? styles.taxRowDivider : {}]}
              >
                <Text style={[styles.cell, styles.center, { width: COL.rate }]}>{formatRate(tax.rateBps)}</Text>
                <Text style={[styles.cell, styles.center, { width: COL.type }]}>{tax.label}</Text>
                <Text style={[styles.cell, styles.num, { width: COL.taxAmount }]}>
                  {formatPriceExact(tax.amountPaise)}
                </Text>
              </View>
            ))}
          </View>
          <Text style={[styles.cell, styles.num, { width: COL.total }]}>{formatPriceExact(line.totalPaise)}</Text>
        </View>
      ))}

      <View style={[styles.row, styles.bold]} wrap={false}>
        <Text style={[styles.cell, { width: leadWidth }]}>TOTAL:</Text>
        <Text style={[styles.cell, styles.num, { width: COL.taxAmount }]}>
          {formatPriceExact(invoice.totals.taxPaise)}
        </Text>
        <Text style={[styles.cell, styles.num, { width: COL.total }]}>
          {formatPriceExact(invoice.totals.totalPaise)}
        </Text>
      </View>

      <View style={styles.row} wrap={false}>
        <View style={styles.wordsCell}>
          <Text style={styles.bold}>Amount in Words:</Text>
          <Text style={styles.bold}>{invoice.totalInWords}</Text>
        </View>
      </View>

      <View style={styles.row} wrap={false}>
        <View style={styles.signRow}>
          <Text style={styles.bold}>For {invoice.seller.tradeName}:</Text>
          <View style={styles.signSpace} />
          <Text style={styles.bold}>Authorized Signatory</Text>
        </View>
      </View>
    </View>
  );
}

function PaymentTable({ invoice }: { invoice: Invoice }) {
  const { payment } = invoice;
  const width = 539 / 4;
  return (
    <View style={styles.paymentTable} wrap={false}>
      <View style={[styles.row, styles.headRow, styles.bold]}>
        <Text style={[styles.cell, { width }]}>Payment Transaction ID</Text>
        <Text style={[styles.cell, { width }]}>Date &amp; Time</Text>
        <Text style={[styles.cell, styles.num, { width }]}>Invoice Value</Text>
        <Text style={[styles.cell, { width }]}>Mode of Payment</Text>
      </View>
      <View style={styles.row}>
        <Text style={[styles.cell, { width }]}>{payment.transactionId ?? '—'}</Text>
        <Text style={[styles.cell, { width }]}>{payment.paidAt ? formatDateTime(payment.paidAt) : '—'}</Text>
        <Text style={[styles.cell, styles.num, { width }]}>{formatPriceExact(invoice.totals.totalPaise)}</Text>
        <Text style={[styles.cell, { width }]}>
          {payment.method === 'COD' ? 'Cash on Delivery' : 'Online (Razorpay)'}
        </Text>
      </View>
    </View>
  );
}

export function InvoiceDocument({ invoice }: { invoice: Invoice }) {
  const { seller } = invoice;
  const placeOfSupply = stateName(invoice.placeOfSupply);

  return (
    <Document
      title={`Invoice ${invoice.invoiceNumber}`}
      author={seller.tradeName}
      subject={`Tax invoice for order ${invoice.orderNumber}`}
      creator={seller.tradeName}
      producer={seller.tradeName}
      language="en-IN"
    >
      <Page size="A4" style={styles.page}>
        {invoice.specimen ? (
          <Text style={styles.watermark} fixed>
            SPECIMEN
          </Text>
        ) : null}

        <View style={styles.headerRow}>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- react-pdf Image has no alt; the PDF title names the document. */}
          <Image src={LOGO} style={styles.logo} />
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Tax Invoice/Bill of Supply/Cash Memo</Text>
            <Text style={styles.copyLabel}>({INVOICE_COPY_LABEL[invoice.copy]})</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.colLeft}>
            <View style={styles.block}>
              <Text style={styles.label}>Sold By:</Text>
              <Text style={styles.bold}>{seller.tradeName}</Text>
              <Text>{seller.legalName}</Text>
              {seller.addressLines.map((line) => (
                <Text key={line}>{line}</Text>
              ))}
              <Text>
                {seller.email} · {seller.phone}
              </Text>
            </View>
            <View style={styles.block}>
              <LabelledLine label="PAN No:" value={seller.pan} />
              <LabelledLine label="GST Registration No:" value={seller.gstin} />
            </View>
            <View style={styles.block}>
              <LabelledLine label="Order Number:" value={invoice.orderNumber} />
              <LabelledLine label="Order Date:" value={formatDate(invoice.orderDate)} />
            </View>
          </View>

          <View style={styles.colRight}>
            <PartyBlock heading="Billing Address:" party={invoice.billTo} align="right" />
            <PartyBlock heading="Shipping Address:" party={invoice.shipTo} align="right" />
            <View style={styles.block}>
              <LabelledLine label="Place of supply:" value={placeOfSupply.toUpperCase()} align="right" />
              <LabelledLine label="Place of delivery:" value={placeOfSupply.toUpperCase()} align="right" />
            </View>
            <View style={styles.block}>
              <LabelledLine label="Invoice Number:" value={invoice.invoiceNumber} align="right" />
              <LabelledLine label="Invoice Date:" value={formatDate(invoice.invoiceDate)} align="right" />
            </View>
          </View>
        </View>

        <ItemTable invoice={invoice} />

        <Text style={styles.note}>Whether tax is payable under reverse charge - No</Text>

        <PaymentTable invoice={invoice} />

        <Text style={styles.footer} fixed>
          This is a computer-generated invoice. Questions about this order? {seller.email} · {seller.phone}
        </Text>
      </Page>
    </Document>
  );
}
