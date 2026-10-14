/**
 * Customer reviews on the product page — the rating summary, the star
 * breakdown, and published reviews (most helpful first), each marked as from
 * a verified buyer, with Sarita's reply where she gave one.
 */
import { HelpfulButton } from '@/components/reviews/helpful-button';
import { StarRating } from '@/components/reviews/star-rating';
import type { ProductReviewSummary, PublicReview } from '@/lib/reviews/review-service';

const dateFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

export function ProductReviews({ summary, reviews }: { summary: ProductReviewSummary; reviews: PublicReview[] }) {
  return (
    <section className="mt-20" aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="font-display text-2xl font-semibold text-forest-900">
        Customer reviews
      </h2>

      {summary.count === 0 ? (
        <p className="mt-3 text-sm text-stone">
          No reviews yet. Reviews come only from customers who bought this product — each buyer gets a review
          link after delivery.
        </p>
      ) : (
        <div className="mt-6 grid gap-10 md:grid-cols-[240px_1fr]">
          <div>
            <p className="flex items-center gap-2">
              <StarRating rating={summary.average} className="text-xl" />
              <span className="font-display text-xl font-semibold text-forest-900">{summary.average.toFixed(1)}</span>
            </p>
            <p className="mt-1 text-sm text-stone">
              {summary.count} verified review{summary.count === 1 ? '' : 's'}
            </p>
            <ul className="mt-4 space-y-1.5">
              {summary.distribution.map((count, index) => {
                const stars = 5 - index;
                const share = Math.round((count / summary.count) * 100);
                return (
                  <li key={stars} className="flex items-center gap-2 text-xs text-stone">
                    <span className="w-8">{stars} ★</span>
                    <span className="h-2 flex-1 overflow-hidden rounded-full bg-forest-100">
                      <span className="block h-full rounded-full bg-gold" style={{ width: `${share}%` }} />
                    </span>
                    <span className="w-8 text-right">{count}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          <ul className="space-y-6">
            {reviews.map((review) => (
              <li key={review.id} className="border-b border-forest-100 pb-6 last:border-b-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StarRating rating={review.rating} />
                  {review.title && <p className="font-medium text-forest-900">{review.title}</p>}
                </div>
                <p className="mt-1 text-xs text-stone">
                  {review.displayName}
                  {review.city ? `, ${review.city}` : ''} · {dateFormatter.format(review.createdAt)} ·{' '}
                  <span className="font-medium text-forest-700">✓ Verified buyer</span>
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-forest-900">{review.body}</p>
                {review.ownerReply && (
                  <div className="mt-3 rounded-lg border-l-2 border-gold bg-forest-50 px-3 py-2 text-sm text-forest-900">
                    <p className="text-xs font-semibold text-forest-800">Reply from Dronagiri Herbal</p>
                    <p className="mt-0.5 whitespace-pre-line">{review.ownerReply}</p>
                  </div>
                )}
                <div className="mt-3">
                  <HelpfulButton reviewId={review.id} initialCount={review.helpfulCount} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
