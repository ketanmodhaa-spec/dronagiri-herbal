'use client';

/**
 * One review in Sarita's queue: publish it, reject it for a posting rule, or
 * reply publicly. Negative is not a reason to reject — the card says so.
 */
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import type { ReviewRejectReason, ReviewStatus } from '@dronagiri/db';

import { StarRating } from '@/components/reviews/star-rating';
import { Button } from '@/components/ui/button';
import { TextareaField } from '@/components/ui/textarea-field';
import { adminPost } from '@/lib/admin/admin-post';
import { REJECT_REASON_LABEL } from '@/lib/reviews/review-labels';

export interface ReviewCardData {
  id: string;
  status: ReviewStatus;
  rating: number;
  title: string | null;
  body: string;
  displayName: string;
  city: string | null;
  submittedAt: string;
  productName: string;
  productSlug: string;
  orderId: string;
  orderNumber: string;
  buyerName: string;
  rejectReason: ReviewRejectReason | null;
  ownerReply: string | null;
}

export function ReviewModerationCard({ review }: { review: ReviewCardData }) {
  const router = useRouter();
  const [panel, setPanel] = useState<'none' | 'reject' | 'reply'>('none');
  const [reason, setReason] = useState<ReviewRejectReason>('ABUSIVE');
  const [reply, setReply] = useState(review.ownerReply ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(body: object) {
    setBusy(true);
    setError(null);
    const result = await adminPost(`/api/admin/reviews/${review.id}`, body);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setPanel('none');
    router.refresh();
  }

  return (
    <article className="rounded-2xl border border-forest-100 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="flex items-center gap-2">
            <StarRating rating={review.rating} className="text-lg" />
            {review.rating <= 2 && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">Critical</span>
            )}
          </p>
          <p className="mt-1 text-sm font-medium text-forest-900">
            <a href={`/products/${review.productSlug}`} target="_blank" rel="noreferrer" className="hover:underline">
              {review.productName}
            </a>
          </p>
        </div>
        <p className="text-right text-xs text-stone">
          {review.submittedAt}
          <br />
          <a href={`/admin/orders/${review.orderId}`} className="underline">
            {review.orderNumber}
          </a>{' '}
          · {review.buyerName}
        </p>
      </header>

      {review.title && <p className="mt-3 font-medium text-forest-900">{review.title}</p>}
      <p className="mt-1 whitespace-pre-line text-sm text-forest-900">{review.body}</p>
      <p className="mt-2 text-xs text-stone">
        Shown as: {review.displayName}
        {review.city ? `, ${review.city}` : ''}
      </p>
      {review.status === 'REJECTED' && review.rejectReason && (
        <p className="mt-2 text-xs text-red-700">Not published: {REJECT_REASON_LABEL[review.rejectReason]}</p>
      )}
      {review.ownerReply && panel !== 'reply' && (
        <p className="mt-3 rounded-lg border-l-2 border-gold bg-forest-50 px-3 py-2 text-sm">
          <span className="block text-xs font-semibold text-forest-800">Your reply</span>
          {review.ownerReply}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-forest-100 pt-4">
        {review.status !== 'PUBLISHED' && (
          <Button size="sm" disabled={busy} onClick={() => void send({ action: 'PUBLISH' })}>
            Publish
          </Button>
        )}
        {review.status !== 'REJECTED' && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPanel('reject')}>
            Don&rsquo;t publish…
          </Button>
        )}
        {review.status === 'PUBLISHED' && (
          <Button size="sm" variant="secondary" disabled={busy} onClick={() => setPanel('reply')}>
            {review.ownerReply ? 'Edit reply' : 'Reply publicly'}
          </Button>
        )}
      </div>

      {panel === 'reject' && (
        <div className="mt-3 space-y-3 rounded-xl bg-forest-50 p-4">
          <p className="text-xs text-stone">
            Only for a posting rule. Honest negative reviews must be published — reply to them instead.
          </p>
          <div className="space-y-1.5">
            {(Object.keys(REJECT_REASON_LABEL) as ReviewRejectReason[]).map((key) => (
              <label key={key} className="flex items-start gap-2 text-sm text-forest-900">
                <input
                  type="radio"
                  name={`reason-${review.id}`}
                  checked={reason === key}
                  onChange={() => setReason(key)}
                  className="mt-1"
                />
                {REJECT_REASON_LABEL[key]}
              </label>
            ))}
          </div>
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void send({ action: 'REJECT', reason })}>
              Don&rsquo;t publish
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel('none')}>
              Back
            </Button>
          </div>
        </div>
      )}

      {panel === 'reply' && (
        <div className="mt-3 space-y-3">
          <TextareaField
            label="Your public reply"
            name={`reply-${review.id}`}
            rows={3}
            maxLength={1000}
            value={reply}
            onChange={(event) => setReply(event.target.value)}
            hint="Shown under the review on the product page. Leave empty and save to remove it."
          />
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void send({ action: 'REPLY', reply })}>
              Save reply
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setPanel('none')}>
              Back
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </article>
  );
}
