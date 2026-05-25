import type { Metadata } from 'next';

import { QuizFlow } from '@/components/quiz/quiz-flow';
import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Container } from '@/components/ui/container';
import { LeafIcon } from '@/components/ui/icons';
import { listActiveProductsForQuiz } from '@/lib/products/product-service';
import { absoluteUrl } from '@/lib/seo/site';

/**
 * The quiz is read-live from the catalogue (so new products become
 * recommendable without a redeploy) and never queries the DB at build time.
 */
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Find Your Product',
  description:
    'A short quiz that matches your hair and skin needs to the Dronagiri Herbal range — handcrafted Ayurvedic formulations from Ahmedabad.',
  alternates: { canonical: absoluteUrl('/quiz') },
  openGraph: {
    title: 'Find Your Product · Dronagiri Herbal',
    description:
      'Answer a few questions about your hair and skin, and we will suggest where to start.',
    url: absoluteUrl('/quiz'),
  },
};

export default async function QuizPage() {
  const products = await listActiveProductsForQuiz();

  return (
    <>
      <SiteHeader />

      <main className="bg-cream pb-20 pt-12 md:pt-16">
        <Container className="max-w-2xl">
          {/* ── Intro band ──────────────────────────────────────────────── */}
          <div className="text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-forest-100 px-4 py-1.5 text-xs font-medium text-forest-800">
              <LeafIcon className="h-3.5 w-3.5 text-forest-700" />
              Personalised in 60 seconds
            </span>
            <h1 className="mt-5 font-display text-3xl font-semibold leading-tight text-forest-900 sm:text-4xl">
              Find your formulation
            </h1>
            <p className="mx-auto mt-3 max-w-lg leading-relaxed text-stone">
              A few questions about how your hair and skin behave — then a short list
              of products from Sarita&rsquo;s shelf that suit where you are right now.
            </p>
          </div>

          {/* ── Quiz card ───────────────────────────────────────────────── */}
          <div className="mt-10 rounded-3xl border border-forest-100 bg-white p-6 shadow-sm sm:p-10">
            <QuizFlow products={products} />
          </div>
        </Container>
      </main>

      <SiteFooter />
    </>
  );
}
