/**
 * Render a tax invoice to PDF bytes — the one artifact behind every channel
 * (WhatsApp document, email attachment, download, print).
 */
import { renderToBuffer } from '@react-pdf/renderer';

import { InvoiceDocument } from './invoice-document';
import type { Invoice } from './invoice-model';

export async function renderInvoicePdf(invoice: Invoice): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument invoice={invoice} />);
}
