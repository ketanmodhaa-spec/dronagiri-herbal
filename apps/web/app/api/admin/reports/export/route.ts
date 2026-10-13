/**
 * GET /api/admin/reports/export?format=xlsx|pdf&period=… (or &from=…&to=…)
 * — download the sales report for a period. Owner only: it shows revenue.
 */
import type { NextRequest } from 'next/server';

import { requireOwner } from '@/lib/auth/require-admin';
import { ValidationError } from '@/lib/errors';
import { errorResponse } from '@/lib/http';
import { renderReportPdf } from '@/lib/reports/render-report';
import { renderReportExcel } from '@/lib/reports/report-excel';
import { resolvePeriod } from '@/lib/reports/report-period';
import { buildSalesReport } from '@/lib/reports/report-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const FORMATS = {
  xlsx: {
    contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    render: renderReportExcel,
  },
  pdf: { contentType: 'application/pdf', render: renderReportPdf },
} as const;

export async function GET(req: NextRequest): Promise<Response> {
  try {
    await requireOwner();
    const params = req.nextUrl.searchParams;

    const formatKey = params.get('format');
    if (formatKey !== 'xlsx' && formatKey !== 'pdf') {
      throw new ValidationError('Choose Excel or PDF.');
    }
    const period = resolvePeriod({ period: params.get('period'), from: params.get('from'), to: params.get('to') });
    if (typeof period === 'string') {
      throw new ValidationError(period);
    }

    const format = FORMATS[formatKey];
    const file = await format.render(await buildSalesReport(period));
    return new Response(new Uint8Array(file), {
      headers: {
        'Content-Type': format.contentType,
        'Content-Disposition': `attachment; filename="dronagiri-sales_${period.slug}.${formatKey}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
