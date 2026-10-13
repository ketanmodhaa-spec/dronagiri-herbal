/** Render a sales report to PDF bytes. */
import { renderToBuffer } from '@react-pdf/renderer';

import { ReportDocument } from './report-document';
import type { SalesReport } from './report-service';

export async function renderReportPdf(report: SalesReport): Promise<Buffer> {
  return renderToBuffer(<ReportDocument report={report} />);
}
