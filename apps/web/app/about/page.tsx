import type { Metadata } from 'next';

import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ArrowRightIcon, LeafIcon } from '@/components/ui/icons';
import { TrustBadge } from '@/components/ui/trust-badge';
import { absoluteUrl } from '@/lib/seo/site';

/**
 * Brand-story page. Pure server-rendered static content — no DB calls, no
 * dynamic data. Sarita-the-founder section is the page's emotional centre;
 * the three-pillar grid and registrations panel give Razorpay KYC reviewers
 * and curious customers the same answers from one URL.
 */

const PAGE_TITLE = 'Our Story';
const PAGE_DESCRIPTION =
  'How Dronagiri Herbal began — Sarita Modha learning to make the Ayurvedic ' +
  'hair and skin care she could trust for her own family, in a small workshop in Ahmedabad.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: absoluteUrl('/about') },
  openGraph: {
    title: 'The Dronagiri Herbal Story',
    description: PAGE_DESCRIPTION,
    url: absoluteUrl('/about'),
  },
};

/** The three differentiators we lean on. Edit in one place, render once. */
const PILLARS = [
  {
    title: 'Small-batch by hand',
    body: 'Every bottle is mixed, poured, and packed in the workshop in Ahmedabad. No mass-production line, no contract manufacturing. The batch that left yesterday is not the batch that is being made today — and we like it that way.',
  },
  {
    title: 'Real herbs, plain ingredient lists',
    body: 'If you cannot pronounce it, it is not in our products. Hibiscus, amla, neem, multani mitti, aloe — the herbs Indian households have used for generations, prepared the way they have always been prepared.',
  },
  {
    title: 'Owner-operated',
    body: 'Sarita answers the WhatsApp number herself. She knows which batch went out yesterday and which one is being mixed today. Customer questions go to her, not a call centre.',
  },
] as const;

/** Registrations + certifications — duplicated from CLAUDE.md project identity. */
const REGISTRATIONS = [
  {
    label: 'WHO GMP Certified',
    detail: 'Workshop carries WHO Good-Manufacturing-Practice certification.',
  },
  {
    label: 'KVIC Registered',
    detail: 'Khadi and Village Industries Commission · S0/GJ/KVIC/22/2022.',
  },
  {
    label: 'UDYAM Registered',
    detail: 'Government of India MSME · UDYAM-GJ-01-0019327.',
  },
  {
    label: 'Trademark ®',
    detail: 'Dronagiri Herbal® is a registered trademark.',
  },
] as const;

export default function AboutPage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-white via-forest-50 to-cream">
          <Container className="flex flex-col items-center py-20 text-center md:py-24">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-100 px-4 py-1.5 text-xs font-medium text-forest-800">
              <LeafIcon className="h-3.5 w-3.5 text-forest-700" />
              Our Story
            </span>

            <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.1] sm:text-5xl md:text-6xl">
              From one kitchen table to a{' '}
              <em className="font-display italic text-forest-700">WHO-GMP workshop</em>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone sm:text-lg">
              Dronagiri Herbal is one woman&rsquo;s answer to a question she could
              not find a good enough answer to — what would Ayurvedic hair and
              skin care look like if it was still made the way it used to be?
            </p>
          </Container>
        </section>

        {/* ── Founder story ────────────────────────────────────────────── */}
        <section className="bg-cream py-16 md:py-24">
          <Container>
            <div className="grid items-start gap-10 md:grid-cols-[280px_1fr] md:gap-14">
              <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-forest-100 to-forest-200 p-10">
                <div className="flex flex-col items-center text-center">
                  <span className="flex h-28 w-28 items-center justify-center rounded-full bg-forest-800 font-display text-4xl font-semibold text-forest-50">
                    SM
                  </span>
                  <p className="mt-5 font-display text-xl font-semibold text-forest-900">
                    Sarita Modha
                  </p>
                  <p className="text-sm text-forest-700">Founder &amp; Formulator</p>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                  In her own words
                </p>
                <blockquote className="mt-3 border-l-2 border-gold pl-5 font-display text-xl italic leading-relaxed text-forest-900 sm:text-2xl">
                  &ldquo;I couldn&rsquo;t find hair and skin care I fully trusted for
                  my own family — so I learned to make it myself.&rdquo;
                </blockquote>

                <div className="mt-8 space-y-5 leading-relaxed text-stone">
                  <p>
                    Sarita Modha started Dronagiri Herbal in 2022 from her kitchen in
                    Ahmedabad. She had been looking for hair and skin care she could
                    trust for her own family — formulations that used the herbs Indian
                    households have used for generations, made the way her grandmother
                    might have made them. She could not find them on a shop shelf, so
                    she learned to make them herself.
                  </p>
                  <p>
                    What began at a kitchen table is today a WHO-GMP certified,
                    KVIC-registered workshop. The recipes have not changed: real
                    Ayurvedic herbs, prepared in small batches, with nothing added
                    that does not belong. Sarita still oversees every batch. The
                    bottles in your hands were poured by hand a few days ago, not
                    months ago, somewhere far away.
                  </p>
                </div>
              </div>
            </div>
          </Container>
        </section>

        {/* ── Three pillars ────────────────────────────────────────────── */}
        <section className="bg-white py-16 md:py-24">
          <Container>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                What makes us different
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                Three things we do not compromise on
              </h2>
            </div>

            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {PILLARS.map((pillar) => (
                <article
                  key={pillar.title}
                  className="rounded-2xl border border-forest-100 bg-forest-50/40 p-6"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-800 text-forest-50">
                    <LeafIcon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold text-forest-900">
                    {pillar.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone">{pillar.body}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Registrations & certifications ───────────────────────────── */}
        <section className="bg-cream py-16 md:py-24">
          <Container>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                Registrations
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                Properly registered, properly inspected
              </h2>
              <p className="mx-auto mt-3 max-w-xl text-stone">
                The documentation behind every bottle — government registrations,
                manufacturing standards, and the trademark that means a product
                with our name on it really is ours.
              </p>
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {REGISTRATIONS.map((registration) => (
                <div
                  key={registration.label}
                  className="rounded-2xl border border-forest-100 bg-white p-5"
                >
                  <TrustBadge>{registration.label}</TrustBadge>
                  <p className="mt-4 text-sm leading-relaxed text-stone">
                    {registration.detail}
                  </p>
                </div>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Visit / contact ──────────────────────────────────────────── */}
        <section className="bg-forest-900 py-16 text-forest-50 md:py-20">
          <Container className="grid items-center gap-10 md:grid-cols-2 md:gap-14">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                Get in touch
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold text-white sm:text-4xl">
                Talk to Sarita
              </h2>
              <p className="mt-4 max-w-md leading-relaxed text-white/70">
                Sarita answers the WhatsApp number herself. Questions about a
                product, your routine, or which formulation to start with — they
                all reach her, not a call centre.
              </p>

              <dl className="mt-8 space-y-3 text-sm">
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <dt className="font-medium text-white/55 sm:w-24">WhatsApp</dt>
                  <dd>
                    <a
                      href="https://wa.me/919429029840"
                      className="text-white underline-offset-2 hover:underline"
                    >
                      +91 94290 29840
                    </a>
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <dt className="font-medium text-white/55 sm:w-24">Email</dt>
                  <dd>
                    <a
                      href="mailto:store@dronagiriherbal.in"
                      className="text-white underline-offset-2 hover:underline"
                    >
                      store@dronagiriherbal.in
                    </a>
                  </dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <dt className="font-medium text-white/55 sm:w-24">Workshop</dt>
                  <dd>Ahmedabad, Gujarat, India</dd>
                </div>
                <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
                  <dt className="font-medium text-white/55 sm:w-24">Hours</dt>
                  <dd>Mon–Sat · 10 AM – 6 PM IST</dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <p className="font-display text-xl font-semibold text-white">
                Not sure where to start?
              </p>
              <p className="mt-3 text-sm leading-relaxed text-white/70">
                Browse the collection, or answer a few short questions about your
                hair and skin and we will point you at the formulations made for
                where you are right now.
              </p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button href="/shop" size="md">
                  Browse the collection
                  <ArrowRightIcon className="h-4 w-4" />
                </Button>
                <Button href="/quiz" variant="secondary" size="md">
                  Take the quiz
                </Button>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
