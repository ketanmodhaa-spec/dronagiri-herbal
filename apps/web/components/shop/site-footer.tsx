import Link from 'next/link';

import { Container } from '@/components/ui/container';
import { LeafIcon } from '@/components/ui/icons';

const EXPLORE_LINKS = [
  { label: 'Shop the Collection', href: '#featured' },
  { label: 'Our Story', href: '#story' },
  { label: 'Find My Product', href: '/quiz' },
] as const;

/** Official registrations — kept verbatim from CLAUDE.md's project identity. */
const CERTIFICATIONS = [
  'UDYAM-GJ-01-0019327',
  'KVIC: S0/GJ/KVIC/22/2022',
  'WHO GMP Certified',
  'Trademark ® Registered',
] as const;

/** Policy pages — also referenced by Razorpay during KYC review. */
const POLICY_LINKS = [
  { label: 'Terms & Conditions', href: '/terms' },
  { label: 'Privacy Policy', href: '/privacy' },
  { label: 'Refund & Returns', href: '/refund-policy' },
  { label: 'Shipping', href: '/shipping-policy' },
  { label: 'Contact', href: '/contact' },
] as const;

export function SiteFooter() {
  return (
    <footer id="contact" className="bg-forest-900 text-forest-50">
      <Container className="py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-forest-700 text-forest-50">
                <LeafIcon className="h-5 w-5" />
              </span>
              <span className="font-display text-lg font-semibold">Dronagiri Herbal</span>
            </div>
            <p className="mt-4 text-sm leading-relaxed text-white/70">
              Sanjivani for hair &amp; skin care — handcrafted Ayurvedic
              formulations, made in small batches with care in Ahmedabad, Gujarat.
            </p>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-white">Explore</h3>
            <ul className="mt-4 space-y-2.5">
              {EXPLORE_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-white/70 transition-colors hover:text-gold"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-white">Get in touch</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-white/70">
              <li>
                <a
                  href="mailto:store@dronagiriherbal.in"
                  className="transition-colors hover:text-gold"
                >
                  store@dronagiriherbal.in
                </a>
              </li>
              <li>
                <a href="tel:+919429029840" className="transition-colors hover:text-gold">
                  +91 94290 29840
                </a>
              </li>
              <li>Ahmedabad, Gujarat, India</li>
            </ul>
          </div>

          <div>
            <h3 className="font-display text-sm font-semibold text-white">Certifications</h3>
            <ul className="mt-4 space-y-2.5">
              {CERTIFICATIONS.map((item) => (
                <li key={item} className="text-sm text-white/70">
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-white/10 pt-6">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-white/70">
            {POLICY_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="transition-colors hover:text-gold">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-4 flex flex-col gap-2 text-xs text-white/55 sm:flex-row sm:items-center sm:justify-between">
            <p>© 2026 Dronagiri Herbal. All rights reserved.</p>
            <p>Dronagiri Herbal® is a registered trademark · Made in Ahmedabad 🇮🇳</p>
          </div>
        </div>
      </Container>
    </footer>
  );
}
