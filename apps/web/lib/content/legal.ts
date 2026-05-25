/**
 * Load the markdown source for a legal page at build time.
 *
 * The .md files live in `apps/web/content/legal/`. Each route's page.tsx
 * calls this at module scope, so the read happens once during the build and
 * the page renders statically — no per-request file I/O.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const LEGAL_DIR = join(process.cwd(), 'content', 'legal');

export type LegalSlug =
  | 'terms'
  | 'privacy'
  | 'refund-policy'
  | 'shipping-policy'
  | 'contact'
  | 'data-deletion';

export function loadLegal(slug: LegalSlug): string {
  return readFileSync(join(LEGAL_DIR, `${slug}.md`), 'utf8');
}
