import type { Metadata } from 'next';

import { PartnerEnquiryForm } from '@/components/partners/partner-enquiry-form';
import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { LeafIcon } from '@/components/ui/icons';
import { DEFAULT_OG_IMAGE, absoluteUrl } from '@/lib/seo/site';

/**
 * B2B landing page — distributors, stockists, dealers and sales agents
 * anywhere in India. Static copy plus the enquiry form; every claim here is
 * a verifiable fact about the business, never a promised margin or scheme.
 */

const PAGE_TITLE = 'Become a Distributor or Dealer';
const PAGE_DESCRIPTION =
  'Partner with Dronagiri Herbal — become a distributor, stockist, dealer or sales agent ' +
  'for handcrafted Ayurvedic hair and skin care, made in a WHO-GMP certified workshop in Ahmedabad.';

export const metadata: Metadata = {
  title: PAGE_TITLE,
  description: PAGE_DESCRIPTION,
  alternates: { canonical: absoluteUrl('/become-a-distributor') },
  openGraph: {
    title: 'Become a Dronagiri Herbal Distributor or Dealer',
    description: PAGE_DESCRIPTION,
    url: absoluteUrl('/become-a-distributor'),
    images: [DEFAULT_OG_IMAGE],
  },
};

const REASONS = [
  {
    title: 'Direct from the maker',
    body: 'You deal with the people who make the products — no layers of middlemen between our workshop and your shelf.',
  },
  {
    title: 'Registered and certified',
    body: 'WHO-GMP certified workshop, KVIC and UDYAM registered, and a registered trademark — the paperwork your customers and retailers ask about.',
  },
  {
    title: 'Ayurvedic range people ask for',
    body: 'Hair and skin care made from herbs Indian households already trust — hibiscus, amla, neem, multani mitti, aloe — in small batches.',
  },
] as const;

const STEPS = [
  { title: 'Send your enquiry', body: 'Tell us who you are and the area you would like to cover. It takes two minutes.' },
  { title: 'We call you', body: 'Sarita or our team calls or WhatsApps you to understand your area and answer your questions.' },
  { title: 'Agree and start', body: 'We agree the territory, pricing and first order together — then your first stock is dispatched.' },
] as const;

export default function BecomeADistributorPage() {
  return (
    <>
      <SiteHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-white via-forest-50 to-cream">
          <Container className="flex flex-col items-center py-16 text-center md:py-24">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-100 px-4 py-1.5 text-xs font-medium text-forest-800">
              <LeafIcon className="h-3.5 w-3.5 text-forest-700" />
              Partner with us
            </span>

            <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.1] sm:text-5xl">
              Grow with{' '}
              <em className="font-display italic text-forest-700">Dronagiri Herbal</em>
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-stone sm:text-lg">
              We are looking for distributors, stockists, dealers and sales agents across
              India to bring our Ayurvedic hair and skin care to their towns and cities.
            </p>
            <p className="mt-3 text-base text-forest-800" lang="hi">
              वितरक, स्टॉकिस्ट, डीलर या सेल्स एजेंट बनने में रुचि है? नीचे फ़ॉर्म भरें।
            </p>

            <div className="mt-8">
              <Button href="#enquire" size="lg">
                Send an enquiry
              </Button>
            </div>
          </Container>
        </section>

        {/* ── Why partner ─────────────────────────────────────────────── */}
        <section className="bg-white py-16 md:py-20">
          <Container>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">
                Why partner with us
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                A brand you can stand behind
              </h2>
            </div>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {REASONS.map((reason) => (
                <article
                  key={reason.title}
                  className="rounded-2xl border border-forest-100 bg-forest-50/40 p-6"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest-800 text-forest-50">
                    <LeafIcon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-5 font-display text-xl font-semibold text-forest-900">
                    {reason.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-stone">{reason.body}</p>
                </article>
              ))}
            </div>
          </Container>
        </section>

        {/* ── How it works ────────────────────────────────────────────── */}
        <section className="bg-cream py-16 md:py-20">
          <Container>
            <div className="text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">
                How it works
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                Three simple steps
              </h2>
            </div>
            <ol className="mt-10 grid gap-6 md:grid-cols-3">
              {STEPS.map((step, index) => (
                <li key={step.title} className="rounded-2xl border border-forest-100 bg-white p-6">
                  <span className="font-display text-3xl font-semibold text-gold-dark">
                    {index + 1}
                  </span>
                  <h3 className="mt-3 font-display text-xl font-semibold text-forest-900">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-stone">{step.body}</p>
                </li>
              ))}
            </ol>
          </Container>
        </section>

        {/* ── Enquiry form ────────────────────────────────────────────── */}
        <section id="enquire" className="scroll-mt-20 bg-white py-16 md:py-20">
          <Container>
            <div className="mx-auto max-w-3xl">
              <div className="text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-dark">
                  Enquiry
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                  Tell us about yourself
                </h2>
                <p className="mx-auto mt-3 max-w-xl text-stone">
                  Fields marked * are required. Everything else simply helps us prepare for our call.
                </p>
              </div>
              <div className="mt-10">
                <PartnerEnquiryForm />
              </div>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
