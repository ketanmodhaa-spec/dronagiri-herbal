/**
 * Sales report → Excel workbook (.xlsx), one sheet per topic.
 *
 * Built for an accountant: amounts are real numbers in rupees with a ₹
 * format (so they sum and filter), every table has a frozen header and an
 * auto-filter, and times are shown in Indian time.
 */
import ExcelJS from 'exceljs';

import {
  ORDER_STATUS_LABEL,
  PAYMENT_STATUS_LABEL,
  REFUND_STATUS_LABEL,
} from '@/lib/orders/order-labels';
import type { SalesReport } from '@/lib/reports/report-service';

const RUPEE_FORMAT = '"₹"#,##0.00';
const DATE_TIME_FORMAT = 'dd-mmm-yyyy hh:mm';
const DATE_FORMAT = 'dd-mmm-yyyy';
const HEADER_FILL = 'FFD8F0E3'; // brand --g100
const HEADER_INK = 'FF1A3D2B'; // brand --g900

const IST_OFFSET_MS = (5 * 60 + 30) * 60 * 1000;

/** Excel has no time zones and reads dates as UTC — shift so it shows IST. */
function ist(date: Date): Date {
  return new Date(date.getTime() + IST_OFFSET_MS);
}

const rupees = (paise: number): number => paise / 100;

const METHOD_LABEL = { ONLINE: 'Online', COD: 'Cash on delivery' } as const;
const REFUND_METHOD_LABEL = { RAZORPAY: 'Razorpay', MANUAL: 'UPI / bank transfer' } as const;

interface Column {
  header: string;
  key: string;
  width: number;
  format?: string;
}

/** A table sheet: styled header, frozen, filterable. */
function addTable(
  workbook: ExcelJS.Workbook,
  name: string,
  columns: Column[],
  rows: Record<string, string | number | Date | null>[],
): ExcelJS.Worksheet {
  const sheet = workbook.addWorksheet(name, { views: [{ state: 'frozen', ySplit: 1 }] });
  sheet.columns = columns.map((column) => ({
    header: column.header,
    key: column.key,
    width: column.width,
    style: column.format ? { numFmt: column.format } : {},
  }));
  sheet.addRows(rows);

  const header = sheet.getRow(1);
  header.font = { bold: true, color: { argb: HEADER_INK } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEADER_FILL } };
  header.alignment = { vertical: 'middle' };
  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };
  return sheet;
}

export async function renderReportExcel(report: SalesReport): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Dronagiri Herbal';
  workbook.created = report.generatedAt;

  /* Summary — label / value pairs. */
  const summary = workbook.addWorksheet('Summary');
  summary.columns = [
    { key: 'label', width: 34 },
    { key: 'value', width: 18 },
  ];
  summary.addRow(['Dronagiri Herbal — Sales report']).font = { bold: true, size: 14, color: { argb: HEADER_INK } };
  summary.addRow([report.period.label]);
  summary.addRow([`Generated ${ist(report.generatedAt).toISOString().slice(0, 16).replace('T', ' ')} IST`]).font = {
    italic: true,
    color: { argb: 'FF6B6B6B' },
  };
  summary.addRow([]);

  const s = report.summary;
  const lines: [string, number, 'money' | 'count'][] = [
    ['Orders placed', s.ordersPlaced, 'count'],
    ['Order value', rupees(s.orderValuePaise), 'money'],
    ['Average order value', rupees(s.averageOrderPaise), 'money'],
    ['Cancelled orders', s.cancelledOrders, 'count'],
    ['Cancelled value', rupees(s.cancelledValuePaise), 'money'],
    ['Net sales (placed − cancelled)', rupees(s.netSalesPaise), 'money'],
    ['Payments received', s.paymentsCount, 'count'],
    ['Money received', rupees(s.receivedPaise), 'money'],
    ['   of which online', rupees(s.receivedOnlinePaise), 'money'],
    ['   of which cash on delivery', rupees(s.receivedCashPaise), 'money'],
    ['Refunds completed', s.refundsCount, 'count'],
    ['Refunded', rupees(s.refundedPaise), 'money'],
    ['Net received (received − refunded)', rupees(s.netReceivedPaise), 'money'],
    ['Refunds still processing', s.pendingRefundsCount, 'count'],
    ['Refunds still processing — value', rupees(s.pendingRefundsPaise), 'money'],
    ['Units sold (net of cancellations, returns)', s.unitsSold, 'count'],
    ['Free replacement orders', s.replacementOrders, 'count'],
    ['Free replacement units', s.replacementUnits, 'count'],
  ];
  for (const [label, value, kind] of lines) {
    const row = summary.addRow([label, value]);
    if (kind === 'money') row.getCell(2).numFmt = RUPEE_FORMAT;
    if (label.startsWith('Net')) row.font = { bold: true };
  }

  addTable(
    workbook,
    'Day by day',
    [
      { header: 'Date', key: 'date', width: 14, format: DATE_FORMAT },
      { header: 'Orders placed', key: 'orders', width: 14 },
      { header: 'Order value', key: 'value', width: 14, format: RUPEE_FORMAT },
      { header: 'Money received', key: 'received', width: 16, format: RUPEE_FORMAT },
      { header: 'Refunded', key: 'refunded', width: 14, format: RUPEE_FORMAT },
      { header: 'Net received', key: 'net', width: 14, format: RUPEE_FORMAT },
    ],
    report.days.map((day) => ({
      // A calendar date, not an instant: midnight UTC displays as that date.
      date: new Date(`${day.date}T00:00:00Z`),
      orders: day.ordersPlaced,
      value: rupees(day.orderValuePaise),
      received: rupees(day.receivedPaise),
      refunded: rupees(day.refundedPaise),
      net: rupees(day.netReceivedPaise),
    })),
  );

  addTable(
    workbook,
    'Orders',
    [
      { header: 'Order', key: 'order', width: 18 },
      { header: 'Placed (IST)', key: 'placed', width: 18, format: DATE_TIME_FORMAT },
      { header: 'Customer', key: 'customer', width: 22 },
      { header: 'City', key: 'city', width: 16 },
      { header: 'State', key: 'state', width: 16 },
      { header: 'Units', key: 'units', width: 8 },
      { header: 'Total', key: 'total', width: 12, format: RUPEE_FORMAT },
      { header: 'Payment', key: 'method', width: 18 },
      { header: 'Payment status', key: 'paymentStatus', width: 16 },
      { header: 'Order status', key: 'status', width: 16 },
    ],
    report.orders.map((order) => ({
      order: order.orderNumber,
      placed: ist(order.placedAt),
      customer: order.customer,
      city: order.city,
      state: order.state,
      units: order.units,
      total: rupees(order.totalPaise),
      method: METHOD_LABEL[order.paymentMethod],
      paymentStatus: PAYMENT_STATUS_LABEL[order.paymentStatus],
      status: ORDER_STATUS_LABEL[order.status],
    })),
  );

  addTable(
    workbook,
    'Payments',
    [
      { header: 'Received (IST)', key: 'paid', width: 18, format: DATE_TIME_FORMAT },
      { header: 'Order', key: 'order', width: 18 },
      { header: 'Amount', key: 'amount', width: 12, format: RUPEE_FORMAT },
      { header: 'Method', key: 'method', width: 18 },
      { header: 'Razorpay payment', key: 'reference', width: 24 },
    ],
    report.payments.map((payment) => ({
      paid: ist(payment.paidAt),
      order: payment.orderNumber,
      amount: rupees(payment.amountPaise),
      method: METHOD_LABEL[payment.paymentMethod],
      reference: payment.reference,
    })),
  );

  addTable(
    workbook,
    'Refunds',
    [
      { header: 'Requested (IST)', key: 'requested', width: 18, format: DATE_TIME_FORMAT },
      { header: 'Completed (IST)', key: 'processed', width: 18, format: DATE_TIME_FORMAT },
      { header: 'Order', key: 'order', width: 18 },
      { header: 'Amount', key: 'amount', width: 12, format: RUPEE_FORMAT },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Method', key: 'method', width: 20 },
      { header: 'Reference', key: 'reference', width: 24 },
      { header: 'Reason', key: 'reason', width: 36 },
      { header: 'Issued by', key: 'issuedBy', width: 16 },
    ],
    report.refunds.map((refund) => ({
      requested: ist(refund.requestedAt),
      processed: refund.processedAt ? ist(refund.processedAt) : null,
      order: refund.orderNumber,
      amount: rupees(refund.amountPaise),
      status: REFUND_STATUS_LABEL[refund.status],
      method: REFUND_METHOD_LABEL[refund.method],
      reference: refund.reference,
      reason: refund.reason,
      issuedBy: refund.issuedBy,
    })),
  );

  addTable(
    workbook,
    'Products',
    [
      { header: 'Product', key: 'name', width: 30 },
      { header: 'SKU', key: 'sku', width: 14 },
      { header: 'Sold', key: 'sold', width: 8 },
      { header: 'Cancelled', key: 'cancelled', width: 10 },
      { header: 'Returned', key: 'returned', width: 10 },
      { header: 'Net units', key: 'net', width: 10 },
      { header: 'Free replacements', key: 'replaced', width: 18 },
      { header: 'Sales value (before refunds)', key: 'revenue', width: 26, format: RUPEE_FORMAT },
    ],
    report.products.map((product) => ({
      name: product.name,
      sku: product.sku,
      sold: product.sold,
      cancelled: product.cancelled,
      returned: product.returned,
      net: product.netUnits,
      replaced: product.replaced,
      revenue: rupees(product.revenuePaise),
    })),
  );

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
