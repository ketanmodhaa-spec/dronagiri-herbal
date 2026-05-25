import Image from 'next/image';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import { LeafIcon } from '@/components/ui/icons';
import { formatPrice } from '@/lib/format';
import type { QuizRecommendation } from '@/lib/quiz/types';

interface QuizResultProps {
  /** Products the quiz settled on, in display order. Empty triggers the fallback. */
  recommendations: QuizRecommendation[];
  /** Whether the user picked hair, skin, or both — used in the fallback copy. */
  focusLabel: string;
  /** Reset to the first question with empty answers. */
  onRestart: () => void;
}

/**
 * Final screen of the quiz. Either a curated list of products with the
 * reason each was chosen, or a friendly fallback when no product matches —
 * we surface this rather than 0 results so the page never feels broken.
 */
export function QuizResult({ recommendations, focusLabel, onRestart }: QuizResultProps) {
  if (recommendations.length === 0) {
    return (
      <div className="text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
          Your match
        </p>
        <h2 className="mt-3 font-display text-2xl font-semibold text-forest-900 sm:text-3xl">
          We are still adding {focusLabel} products
        </h2>
        <p className="mx-auto mt-4 max-w-md leading-relaxed text-stone">
          New {focusLabel} formulations join the shelf every few weeks. Save the page
          and check back, or message us on WhatsApp and we will let you know.
        </p>

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button href="/" size="lg" variant="secondary">
            Browse what we have
          </Button>
          <Button onClick={onRestart} size="lg" variant="ghost">
            Retake the quiz
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
        Your match
      </p>
      <h2 className="mt-3 font-display text-2xl font-semibold text-forest-900 sm:text-3xl">
        Based on your answers, we would start with
      </h2>

      <ul className="mt-8 grid gap-5">
        {recommendations.map(({ product, reason }) => {
          const onSale =
            product.comparePaise !== null && product.comparePaise > product.pricePaise;

          return (
            <li
              key={product.slug}
              className="overflow-hidden rounded-2xl bg-white ring-1 ring-forest-100"
            >
              <div className="grid items-stretch gap-0 sm:grid-cols-[180px_1fr]">
                <div className="relative aspect-square overflow-hidden bg-gradient-to-br from-forest-100 to-forest-200 sm:aspect-auto">
                  {product.image ? (
                    <Image
                      src={product.image.url}
                      alt={product.image.alt ?? product.name}
                      width={product.image.width}
                      height={product.image.height}
                      sizes="(min-width: 640px) 180px, 100vw"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <LeafIcon className="h-14 w-14 text-forest-600" />
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 p-5">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-gold">
                    {product.categoryName}
                  </p>
                  <h3 className="font-display text-xl font-semibold text-forest-900">
                    {product.name}
                  </h3>
                  {product.tagline && (
                    <p className="text-sm italic leading-relaxed text-stone">
                      {product.tagline}
                    </p>
                  )}

                  <p className="mt-1 rounded-lg bg-forest-50 px-3 py-2 text-sm leading-relaxed text-forest-900">
                    <span className="font-semibold">Why we picked this:</span> {reason}
                  </p>

                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-body text-lg font-medium text-forest-800">
                      {formatPrice(product.pricePaise)}
                    </span>
                    {onSale && product.comparePaise !== null && (
                      <span className="text-sm text-stone-light line-through">
                        {formatPrice(product.comparePaise)}
                      </span>
                    )}
                    {product.sizeLabel && (
                      <span className="ml-auto text-xs text-stone-light">
                        {product.sizeLabel}
                      </span>
                    )}
                  </div>

                  <div className="mt-3">
                    <Link
                      href={`/products/${product.slug}`}
                      className="inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-800"
                    >
                      View product
                      <span aria-hidden>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button onClick={onRestart} size="lg" variant="secondary">
          Retake the quiz
        </Button>
      </div>
    </div>
  );
}
