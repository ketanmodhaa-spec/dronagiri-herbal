/**
 * Brand assets shared by every PDF (tax invoice, sales report): the DM Sans
 * font family and the logo.
 *
 * Assets are read into memory and handed to react-pdf as data, not paths:
 * react-pdf treats a Windows path (`D:\…`) as a URL and tries to fetch it.
 * Data works the same in local dev and on Vercel, where `next.config.mjs`
 * (`outputFileTracingIncludes`) ships this folder with the functions that
 * render PDFs.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';

import { Font } from '@react-pdf/renderer';

const ASSET_DIR = path.join(process.cwd(), 'lib', 'pdf', 'assets');

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

/** The font family registered above — use it as `fontFamily` in every PDF. */
export const PDF_FONT_FAMILY = 'DM Sans';

export const PDF_LOGO = { data: readFileSync(path.join(ASSET_DIR, 'logo.jpg')), format: 'jpg' as const };
