/**
 * GET /dev/invoice-specimen?state=24|27[&gstin=…] — a SPECIMEN tax invoice
 * for a mixed-rate order (5% + 18% + shipping), to check the layout and to
 * send the CA for approval. Delivery inside Gujarat (24) shows CGST + SGST;
 * anywhere else (27 = Maharashtra) shows IGST.
 *
 * Exists only in `next dev`: any production build answers 404, like /dev/pay.
 * Every figure is invented and the page is watermarked SPECIMEN.
 */
import { notFound } from 'next/navigation';
import type { NextRequest } from 'next/server';

import { gstinSchema } from '@dronagiri/validators';

import { serverConfig } from '@/lib/config.server';
import { buildInvoice, type InvoiceParty } from '@/lib/invoice/invoice-model';
import { renderInvoicePdf } from '@/lib/invoice/render-invoice';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest): Promise<Response> {
  if (serverConfig.isProduction) notFound();

  const state = req.nextUrl.searchParams.get('state') === '27' ? '27' : '24';
  const gstin = gstinSchema.safeParse(req.nextUrl.searchParams.get('gstin') ?? '');
  const buyer: InvoiceParty = {
    name: 'Sample Customer',
    addressLines: ['12 Sample Society', state === '24' ? 'Ahmedabad 380015' : 'Pune 411001'],
    stateCode: state,
    phone: '+91 90000 00000',
  };

  const invoice = buildInvoice({
    copy: 'ORIGINAL',
    specimen: true,
    seller: {
      tradeName: 'Dronagiri Herbal',
      legalName: 'Legal name exactly as on the GST certificate',
      addressLines: ['Principal place of business, as on the GST certificate', 'Ahmedabad, Gujarat'],
      stateCode: '24',
      gstin: '24AQDPM2479C2Z1',
      pan: 'AQDPM2479C',
      email: 'store@dronagiriherbal.in',
      phone: '+91 94290 29840',
    },
    invoiceNumber: 'DH2627-SPECIMEN',
    invoiceDate: new Date(),
    orderNumber: 'DH-26-SPECIMEN',
    orderDate: new Date(),
    billTo: { ...buyer, gstin: gstin.success ? gstin.data : null },
    shipTo: buyer,
    items: [
      { description: 'Hibiscus Shampoo 200 ml', hsnCode: '33051090', unitPricePaise: 19900, quantity: 1, gstRateBps: 500 },
      { description: 'Aloevera Gel 100 g', hsnCode: '33049990', unitPricePaise: 24900, quantity: 1, gstRateBps: 1800 },
    ],
    shippingPaise: 4900,
    payment: { method: 'ONLINE', transactionId: 'pay_SPECIMEN', paidAt: new Date() },
  });

  const pdf = await renderInvoicePdf(invoice);
  return new Response(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="specimen-invoice-${state}.pdf"`,
      'Cache-Control': 'no-store',
    },
  });
}
