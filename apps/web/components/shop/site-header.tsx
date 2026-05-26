import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { LeafIcon } from '@/components/ui/icons';

/**
 * Top-level nav links. Each one is a full path so the header works
 * identically from any page — no homepage-only anchors hiding here.
 */
const NAV_LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'Our Story', href: '/about' },
  { label: 'Contact', href: '/contact' },
] as const;

/** Sticky storefront header — brand mark, section links, and the quiz CTA. */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-forest-100 bg-white">
      <Container className="flex h-16 items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Dronagiri Herbal — home"
          className="flex items-center gap-2.5"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-800 text-forest-50">
            <LeafIcon className="h-5 w-5" />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-display text-lg font-semibold text-forest-900">
              Dronagiri Herbal
            </span>
            <span className="text-[10px] uppercase tracking-[0.16em] text-stone-light">
              Sanjivani for Hair &amp; Skin
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-stone transition-colors hover:text-forest-800"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <Button href="/quiz" size="sm">
          Find My Product
        </Button>
      </Container>
    </header>
  );
}
