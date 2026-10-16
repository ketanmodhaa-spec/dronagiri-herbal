import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { getAdminOrNull } from '@/lib/auth/require-admin';
import { cn } from '@/lib/cn';
import { formatPrice } from '@/lib/format';
import { presetPeriod, REPORT_PRESETS, resolvePeriod } from '@/lib/reports/report-period';
import { buildSalesReport } from '@/lib/reports/report-service';

export const metadata: Metadata = { title: 'Reports' };
export const dynamic = 'force-dynamic';

interface ReportsPageProps {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>;
}

function Figure({ label, value, note, strong }: { label: string; value: string; note?: string; strong?: boolean }) {
  return (
    <div className={cn('rounded-2xl border p-4', strong ? 'border-forest-200 bg-forest-100' : 'border-forest-100 bg-white')}>
      <p className="text-xs text-stone">{label}</p>
      <p className="mt-1 font-display text-xl font-semibold text-forest-900">{value}</p>
      {note && <p className="mt-0.5 text-xs text-stone">{note}</p>}
    </div>
  );
}

export default async function AdminReportsPage(props: ReportsPageProps) {
  const searchParams = await props.searchParams;
  const admin = await getAdminOrNull();
  if (!admin) {
    redirect('/admin/login');
  }
  if (admin.role !== 'OWNER') {
    redirect('/admin');
  }

  const isCustom = Boolean(searchParams.from || searchParams.to);
  const resolved = resolvePeriod(searchParams);
  const error = typeof resolved === 'string' ? resolved : null;
  const period = typeof resolved === 'string' ? presetPeriod('this-month') : resolved;
  const activePreset = isCustom ? null : (REPORT_PRESETS.find((item) => item.key === searchParams.period)?.key ?? 'this-month');

  const report = await buildSalesReport(period);
  const s = report.summary;

  // The export route takes the same query the page was opened with.
  const query = new URLSearchParams(
    isCustom && !error
      ? { from: searchParams.from ?? '', to: searchParams.to ?? '' }
      : { period: activePreset ?? 'this-month' },
  ).toString();

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header>
        <Link href="/admin" className="text-sm text-forest-700 hover:text-forest-800">
          ← Dashboard
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold text-forest-900">Reports</h1>
        <p className="mt-1 text-sm text-stone">Sales, money received and refunds for any period.</p>
      </header>

      <nav aria-label="Report period" className="-mx-5 mt-5 overflow-x-auto px-5">
        <ul className="flex gap-2 whitespace-nowrap pb-1">
          {REPORT_PRESETS.map((preset) => (
            <li key={preset.key}>
              <Link
                href={`/admin/reports?period=${preset.key}`}
                aria-current={preset.key === activePreset ? 'page' : undefined}
                className={cn(
                  'inline-block rounded-full border px-3.5 py-1.5 text-sm transition-colors',
                  preset.key === activePreset
                    ? 'border-forest-800 bg-forest-800 text-white'
                    : 'border-forest-200 bg-white text-forest-800 hover:bg-forest-50',
                )}
              >
                {preset.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <form action="/admin/reports" className="mt-3 flex flex-wrap items-end gap-2 text-sm">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone">From</span>
          <input
            type="date"
            name="from"
            defaultValue={searchParams.from}
            required
            className="h-10 rounded-lg border border-forest-200 bg-white px-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-stone">To</span>
          <input
            type="date"
            name="to"
            defaultValue={searchParams.to}
            required
            className="h-10 rounded-lg border border-forest-200 bg-white px-2"
          />
        </label>
        <button
          type="submit"
          className="h-10 rounded-full border border-forest-600 bg-white px-4 font-medium text-forest-800 hover:bg-forest-50"
        >
          Show
        </button>
      </form>
      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error} Showing this month instead.
        </p>
      )}

      <section className="mt-6">
        <h2 className="font-display text-lg font-semibold text-forest-900">{period.label}</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Figure label="Orders placed" value={String(s.ordersPlaced)} note={`Average ${formatPrice(s.averageOrderPaise)}`} />
          <Figure
            label="Order value"
            value={formatPrice(s.orderValuePaise)}
            note={s.cancelledOrders > 0 ? `${s.cancelledOrders} cancelled (${formatPrice(s.cancelledValuePaise)})` : 'None cancelled'}
          />
          <Figure
            label="Money received"
            value={formatPrice(s.receivedPaise)}
            note={`Online ${formatPrice(s.receivedOnlinePaise)} · Cash ${formatPrice(s.receivedCashPaise)}`}
          />
          <Figure
            label="Refunded"
            value={formatPrice(s.refundedPaise)}
            note={
              s.pendingRefundsCount > 0
                ? `+ ${formatPrice(s.pendingRefundsPaise)} still processing`
                : `${s.refundsCount} refund${s.refundsCount === 1 ? '' : 's'}`
            }
          />
          <Figure label="Net received" value={formatPrice(s.netReceivedPaise)} note="Received − refunded" strong />
          <Figure
            label="Units sold"
            value={String(s.unitsSold)}
            note={s.replacementOrders > 0 ? `+ ${s.replacementUnits} sent free as replacements` : 'Net of returns'}
          />
        </div>
      </section>

      {report.products.length > 0 && (
        <section className="mt-6 rounded-2xl border border-forest-100 bg-white p-5">
          <h2 className="font-display text-lg font-semibold text-forest-900">Best sellers</h2>
          <ul className="mt-2 divide-y divide-forest-100 text-sm">
            {report.products.slice(0, 5).map((product) => (
              <li key={product.sku} className="flex justify-between gap-3 py-2">
                <span className="text-forest-900">
                  {product.name} <span className="text-stone">× {product.netUnits}</span>
                </span>
                <span className="text-forest-900">{formatPrice(product.revenuePaise)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-6 flex flex-wrap gap-3">
        <a
          href={`/api/admin/reports/export?format=xlsx&${query}`}
          className="inline-flex h-12 items-center rounded-full bg-forest-800 px-6 text-sm font-medium text-white hover:bg-forest-700"
        >
          Download Excel
        </a>
        <a
          href={`/api/admin/reports/export?format=pdf&${query}`}
          className="inline-flex h-12 items-center rounded-full border border-forest-600 bg-white px-6 text-sm font-medium text-forest-800 hover:bg-forest-50"
        >
          Download PDF
        </a>
      </section>
      <p className="mt-3 text-xs text-stone">
        Money is counted on the day it moved: payments when received, refunds when completed. Orders count on the
        day they were placed. Unpaid online orders are not included. The Excel file has every order, payment and
        refund.
      </p>
    </main>
  );
}
