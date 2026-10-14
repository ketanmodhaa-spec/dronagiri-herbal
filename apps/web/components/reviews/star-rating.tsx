import { cn } from '@/lib/cn';

/** Read-only stars, e.g. 4 of 5 — with the number for screen readers. */
export function StarRating({ rating, className }: { rating: number; className?: string }) {
  const rounded = Math.round(rating);
  return (
    <span className={cn('inline-flex text-gold-dark', className)} role="img" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} aria-hidden="true" className={star <= rounded ? undefined : 'text-forest-200'}>
          ★
        </span>
      ))}
    </span>
  );
}
