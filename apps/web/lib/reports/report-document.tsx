/**
 * Sales report PDF — the shareable one-glance version: headline figures,
 * the period day by day (month by month for long periods), products and
 * refunds. The full order and payment lists live in the Excel download.
 *
 * Pure layout: every figure arrives pre-computed on `SalesReport`.
 */
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

import { formatPriceExact } from '@/lib/format';
import { REFUND_STATUS_LABEL } from '@/lib/orders/order-labels';
import { PDF_FONT_FAMILY, PDF_LOGO } from '@/lib/pdf/brand-assets';
import type { ReportDay, SalesReport } from '@/lib/reports/report-service';

/** Brand palette (CLAUDE.md). */
const G900 = '#1A3D2B';
const G100 = '#D8F0E3';
const G50 = '#EDF8F2';
const GOLD = '#C9A84C';
const MUTED = '#5A5A5A';
const RULE = 0.5;

/** Beyond this many days, the period table groups by month. */
const MAX_DAILY_ROWS = 62;

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 36,
    paddingHorizontal: 32,
    fontFamily: PDF_FONT_FAMILY,
    fontSize: 8,
    lineHeight: 1.35,
    color: '#111111',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 1.5,
    borderColor: GOLD,
    paddingBottom: 8,
  },
  logo: { width: 96, height: 52, objectFit: 'contain' },
  titleBlock: { alignItems: 'flex-end' },
  title: { fontSize: 15, fontWeight: 700, color: G900, lineHeight: 1.2, marginBottom: 3 },
  subtitle: { fontSize: 9, color: G900, marginTop: 2 },
  generated: { fontSize: 7, color: MUTED, marginTop: 2 },
  sectionTitle: { fontSize: 10, fontWeight: 700, color: G900, marginTop: 16, marginBottom: 6 },
  cards: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -3 },
  card: { width: '33.33%', padding: 3 },
  cardInner: { backgroundColor: G50, borderRadius: 4, padding: 7, minHeight: 44 },
  cardStrong: { backgroundColor: G100 },
  cardLabel: { fontSize: 7, color: MUTED },
  cardValue: { fontSize: 12, fontWeight: 700, color: G900, marginTop: 2 },
  cardNote: { fontSize: 6.5, color: MUTED, marginTop: 1 },
  table: { borderTopWidth: RULE, borderColor: '#BBBBBB' },
  row: { flexDirection: 'row', borderBottomWidth: RULE, borderColor: '#DDDDDD' },
  headRow: { backgroundColor: G100, borderColor: '#BBBBBB' },
  totalRow: { backgroundColor: G50 },
  cell: { paddingVertical: 3, paddingHorizontal: 4 },
  num: { textAlign: 'right' },
  bold: { fontWeight: 700 },
  empty: { color: MUTED, fontStyle: 'normal' },
  footer: {
    position: 'absolute',
    bottom: 16,
    left: 32,
    right: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 6.5,
    color: MUTED,
  },
});

const stamp = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});
const dayLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' });
const monthLabel = new Intl.DateTimeFormat('en-IN', { timeZone: 'UTC', month: 'long', year: 'numeric' });
const shortDate = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short' });

const money = formatPriceExact;

function Card({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <View style={styles.card}>
      <View style={strong ? [styles.cardInner, styles.cardStrong] : styles.cardInner}>
        <Text style={styles.cardLabel}>{label}</Text>
        <Text style={styles.cardValue}>{value}</Text>
        {note ? <Text style={styles.cardNote}>{note}</Text> : null}
      </View>
    </View>
  );
}

interface TableColumn<T> {
  title: string;
  width: string;
  numeric?: boolean;
  value: (row: T) => string;
}

function Table<T>({ columns, rows, total }: { columns: TableColumn<T>[]; rows: T[]; total?: string[] }) {
  return (
    <View style={styles.table}>
      <View style={[styles.row, styles.headRow]} fixed>
        {columns.map((column) => (
          <Text
            key={column.title}
            style={[styles.cell, styles.bold, { width: column.width }, column.numeric ? styles.num : {}]}
          >
            {column.title}
          </Text>
        ))}
      </View>
      {rows.map((row, index) => (
        <View key={index} style={styles.row} wrap={false}>
          {columns.map((column) => (
            <Text key={column.title} style={[styles.cell, { width: column.width }, column.numeric ? styles.num : {}]}>
              {column.value(row)}
            </Text>
          ))}
        </View>
      ))}
      {total && (
        <View style={[styles.row, styles.totalRow]} wrap={false}>
          {columns.map((column, index) => (
            <Text
              key={column.title}
              style={[styles.cell, styles.bold, { width: column.width }, column.numeric ? styles.num : {}]}
            >
              {total[index] ?? ''}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

const hasActivity = (day: ReportDay): boolean =>
  day.ordersPlaced > 0 || day.receivedPaise > 0 || day.refundedPaise > 0;

/**
 * Short periods: the days that had any activity (the Excel keeps every day).
 * Long periods: summed into calendar months, all of them.
 */
function periodRows(days: ReportDay[]): { label: string; day: ReportDay }[] {
  if (days.length <= MAX_DAILY_ROWS) {
    return days
      .filter(hasActivity)
      .map((day) => ({ label: dayLabel.format(new Date(`${day.date}T00:00:00Z`)), day }));
  }
  const months = new Map<string, ReportDay>();
  for (const day of days) {
    const key = day.date.slice(0, 7);
    const month = months.get(key) ?? {
      date: `${key}-01`,
      ordersPlaced: 0,
      orderValuePaise: 0,
      receivedPaise: 0,
      refundedPaise: 0,
      netReceivedPaise: 0,
    };
    month.ordersPlaced += day.ordersPlaced;
    month.orderValuePaise += day.orderValuePaise;
    month.receivedPaise += day.receivedPaise;
    month.refundedPaise += day.refundedPaise;
    month.netReceivedPaise += day.netReceivedPaise;
    months.set(key, month);
  }
  return [...months.values()].map((month) => ({
    label: monthLabel.format(new Date(`${month.date}T00:00:00Z`)),
    day: month,
  }));
}

export function ReportDocument({ report }: { report: SalesReport }) {
  const s = report.summary;
  const rows = periodRows(report.days);
  const byMonth = report.days.length > MAX_DAILY_ROWS;

  return (
    <Document title={`Sales report — ${report.period.label}`} author="Dronagiri Herbal">
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Image src={PDF_LOGO} style={styles.logo} />
          <View style={styles.titleBlock}>
            <Text style={styles.title}>Sales report</Text>
            <Text style={styles.subtitle}>{report.period.label}</Text>
            <Text style={styles.generated}>Generated {stamp.format(report.generatedAt)} IST</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>At a glance</Text>
        <View style={styles.cards}>
          <Card label="Orders placed" value={String(s.ordersPlaced)} note={`Average ${money(s.averageOrderPaise)}`} />
          <Card label="Order value" value={money(s.orderValuePaise)} note={`Net of cancellations ${money(s.netSalesPaise)}`} />
          <Card
            label="Cancelled"
            value={String(s.cancelledOrders)}
            note={s.cancelledOrders > 0 ? `${money(s.cancelledValuePaise)} of orders` : undefined}
          />
          <Card
            label="Money received"
            value={money(s.receivedPaise)}
            note={`Online ${money(s.receivedOnlinePaise)} · Cash ${money(s.receivedCashPaise)}`}
          />
          <Card
            label="Refunded"
            value={money(s.refundedPaise)}
            note={
              s.pendingRefundsCount > 0
                ? `${s.refundsCount} done · ${money(s.pendingRefundsPaise)} still processing`
                : `${s.refundsCount} refund${s.refundsCount === 1 ? '' : 's'}`
            }
          />
          <Card label="Net received" value={money(s.netReceivedPaise)} note="Received − refunded" strong />
          <Card label="Units sold" value={String(s.unitsSold)} note="Net of cancellations and returns" />
          <Card
            label="Free replacements"
            value={String(s.replacementOrders)}
            note={`${s.replacementUnits} unit${s.replacementUnits === 1 ? '' : 's'} sent`}
          />
        </View>

        <Text style={styles.sectionTitle}>{byMonth ? 'Month by month' : 'Day by day'}</Text>
        {!byMonth && rows.length < report.days.length && (
          <Text style={[styles.empty, { marginBottom: 4 }]}>Days with no orders, payments or refunds are left out.</Text>
        )}
        <Table
          columns={[
            { title: byMonth ? 'Month' : 'Day', width: '24%', value: (row) => row.label },
            { title: 'Orders', width: '10%', numeric: true, value: (row) => String(row.day.ordersPlaced) },
            { title: 'Order value', width: '16.5%', numeric: true, value: (row) => money(row.day.orderValuePaise) },
            { title: 'Received', width: '16.5%', numeric: true, value: (row) => money(row.day.receivedPaise) },
            { title: 'Refunded', width: '16.5%', numeric: true, value: (row) => money(row.day.refundedPaise) },
            { title: 'Net received', width: '16.5%', numeric: true, value: (row) => money(row.day.netReceivedPaise) },
          ]}
          rows={rows}
          total={[
            'Total',
            String(s.ordersPlaced),
            money(s.orderValuePaise),
            money(s.receivedPaise),
            money(s.refundedPaise),
            money(s.netReceivedPaise),
          ]}
        />

        <Text style={styles.sectionTitle}>Products</Text>
        {report.products.length === 0 ? (
          <Text style={styles.empty}>No products sold in this period.</Text>
        ) : (
          <Table
            columns={[
              { title: 'Product', width: '34%', value: (row) => row.name },
              { title: 'Sold', width: '9%', numeric: true, value: (row) => String(row.sold) },
              { title: 'Cancelled', width: '11%', numeric: true, value: (row) => String(row.cancelled) },
              { title: 'Returned', width: '11%', numeric: true, value: (row) => String(row.returned) },
              { title: 'Net', width: '8%', numeric: true, value: (row) => String(row.netUnits) },
              { title: 'Replaced', width: '10%', numeric: true, value: (row) => String(row.replaced) },
              { title: 'Sales value', width: '17%', numeric: true, value: (row) => money(row.revenuePaise) },
            ]}
            rows={report.products}
          />
        )}

        <Text style={styles.sectionTitle}>Refunds</Text>
        {report.refunds.length === 0 ? (
          <Text style={styles.empty}>No refunds in this period.</Text>
        ) : (
          <Table
            columns={[
              { title: 'Requested', width: '12%', value: (row) => shortDate.format(row.requestedAt) },
              { title: 'Order', width: '17%', value: (row) => row.orderNumber },
              { title: 'Amount', width: '13%', numeric: true, value: (row) => money(row.amountPaise) },
              { title: 'Status', width: '12%', value: (row) => REFUND_STATUS_LABEL[row.status] },
              { title: 'Reason', width: '32%', value: (row) => row.reason },
              { title: 'By', width: '14%', value: (row) => row.issuedBy },
            ]}
            rows={report.refunds}
          />
        )}

        <View style={styles.footer} fixed>
          <Text>Dronagiri Herbal · Amounts in ₹ · Times in IST · Full order and payment lists in the Excel download</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}
