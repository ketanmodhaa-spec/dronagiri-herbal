import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/ui/container';
import { ArrowRightIcon, LeafIcon } from '@/components/ui/icons';
import { ProductCard } from '@/components/ui/product-card';
import { TrustBadge } from '@/components/ui/trust-badge';
import { getFeaturedProducts } from '@/lib/products/product-service';

/**
 * Render per request, never at build time. The featured grid is read live
 * from the catalogue so products Sarita adds via the admin panel appear
 * immediately — and the build stays decoupled from the database (no query
 * during `next build`, immune to Neon scale-to-zero).
 */
export const dynamic = 'force-dynamic';

/** Reassurance items shown directly under the hero call-to-action. */
const TRUST_ITEMS = [
  'KVIC Registered',
  'WHO GMP Certified',
  '100% Ayurvedic',
  'Cash on Delivery',
  'Free Shipping',
] as const;

/** Credentials surfaced alongside the founder's story. */
const STORY_CREDENTIALS = ['WHO GMP Certified', 'KVIC Registered', 'UDYAM Registered'] as const;

export default async function HomePage() {
  const featuredProducts = await getFeaturedProducts(8);

  return (
    <>
      <SiteHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <section className="bg-gradient-to-b from-white via-forest-50 to-cream">
          <Container className="flex flex-col items-center py-20 text-center md:py-28">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-100 px-4 py-1.5 text-xs font-medium text-forest-800">
              <LeafIcon className="h-3.5 w-3.5 text-forest-700" />
              Trusted Ayurvedic care · Handcrafted since 2022
            </span>

            <h1 className="mt-6 max-w-3xl font-display text-4xl font-semibold leading-[1.1] sm:text-5xl md:text-6xl">
              Herbs that{' '}
              <em className="font-display italic text-forest-700">actually heal</em> your
              hair &amp; skin
            </h1>

            <p className="mt-6 max-w-xl text-base leading-relaxed text-stone sm:text-lg">
              Small-batch Ayurvedic formulations from Sarita Modha&rsquo;s workshop in
              Ahmedabad — real herbs, honest ingredients, and no shortcuts. The way
              remedies were always meant to be made.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button href="#featured" size="lg">
                Shop the Collection
                <ArrowRightIcon className="h-4 w-4" />
              </Button>
              <Button href="/quiz" size="lg" variant="secondary">
                Find My Product
              </Button>
            </div>

            <div className="mt-12 flex flex-wrap items-center justify-center gap-2.5">
              {TRUST_ITEMS.map((item) => (
                <TrustBadge key={item}>{item}</TrustBadge>
              ))}
            </div>
          </Container>
        </section>

        {/* ── Featured products ────────────────────────────────────────── */}
        <section id="featured" className="bg-cream py-16 md:py-24">
          <Container>
            <div className="flex flex-col items-center text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
                The Collection
              </p>
              <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                Bestsellers, made by hand
              </h2>
              <p className="mt-3 max-w-lg text-stone">
                Each remedy is mixed, poured, and packed in small batches — never
                mass-produced.
              </p>
            </div>

            {featuredProducts.length > 0 ? (
              <div className="mt-12 grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">
                {featuredProducts.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>
            ) : (
              <p className="mt-12 text-center text-stone-light">
                Our catalogue is being prepared — please check back shortly.
              </p>
            )}
          </Container>
        </section>

        {/* ── Quiz call-to-action ──────────────────────────────────────── */}
        <section id="quiz" className="bg-forest-900 py-16 md:py-24">
          <Container className="flex flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-medium text-forest-50 ring-1 ring-white/15">
              <LeafIcon className="h-3.5 w-3.5 text-gold" />
              Personalised in 60 seconds
            </span>

            <h2 className="mt-5 max-w-2xl font-display text-3xl font-semibold text-white sm:text-4xl">
              Not sure which remedy is right for you?
            </h2>
            <p className="mt-4 max-w-xl text-white/70">
              Answer a few questions about your hair and skin, and we&rsquo;ll match you
              with the formulations made for exactly your needs.
            </p>

            <Button href="/quiz" size="lg" className="mt-8">
              Take the Quiz
              <ArrowRightIcon className="h-4 w-4" />
            </Button>
          </Container>
        </section>

        {/* ── Brand story ──────────────────────────────────────────────── */}
        <section id="story" className="bg-cream py-16 md:py-24">
          <Container>
            <div className="grid items-center gap-10 md:grid-cols-2 md:gap-16">
              <div className="flex items-center justify-center rounded-3xl bg-gradient-to-br from-forest-100 to-forest-200 p-12">
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
                  Our Story
                </p>
                <h2 className="mt-2 font-display text-3xl font-semibold sm:text-4xl">
                  From one kitchen in Ahmedabad
                </h2>

                <blockquote className="mt-6 border-l-2 border-gold pl-5 font-display text-xl italic leading-relaxed text-forest-900">
                  &ldquo;I couldn&rsquo;t find hair and skin care I fully trusted for my
                  own family — so I learned to make it myself.&rdquo;
                </blockquote>
                <p className="mt-3 text-sm font-medium text-stone-light">
                  — Sarita Modha, Founder
                </p>

                <p className="mt-6 leading-relaxed text-stone">
                  What began at a kitchen table is today a WHO-GMP certified,
                  KVIC-registered workshop. The recipes haven&rsquo;t changed: real
                  Ayurvedic herbs, prepared in small batches, with nothing added that
                  does not belong.
                </p>

                <div className="mt-6 flex flex-wrap gap-2.5">
                  {STORY_CREDENTIALS.map((credential) => (
                    <TrustBadge key={credential}>{credential}</TrustBadge>
                  ))}
                </div>
              </div>
            </div>
          </Container>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
