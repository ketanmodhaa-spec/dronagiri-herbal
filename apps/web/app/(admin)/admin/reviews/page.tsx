import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';

import { ReviewStatus } from '@dronagiri/db';

import { ReviewModerationCard, type ReviewCardData } from '@/components/admin/review-moderation-card';
import { getAdminOrNull } from '@/lib/auth/require-admin';
import { cn } from '@/lib/cn';
import { countPendingReviews, listReviewsForAdmin } from '@/lib/reviews/review-service';

export const metadata: Metadata = { title: 'Reviews' };
export const dynamic = 'force-dynamic';

const TABS = [
  { status: ReviewStatus.PENDING, label: 'To check' },
  { status: ReviewStatus.PUBLISHED, label: 'Published' },
  { status: ReviewStatus.REJECTED, label: 'Not published' },
] as const;

const submittedFormatter = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata',
  day: 'numeric',
  month: 'short',
  hour: 'numeric',
  minute: '2-digit',
});

export default async function AdminReviewsPage(props: { searchParams: Promise<{ status?: string }> }) {
  const searchParams = await props.searchParams;
  if (!(await getAdminOrNull())) {
    redirect('/admin/login');
  }
  const status = TABS.find((tab) => tab.status === searchParams.status)?.status ?? ReviewStatus.PENDING;
  const [reviews, pending] = await Promise.all([listReviewsForAdmin(status), countPendingReviews()]);

  const cards: ReviewCardData[] = reviews.map((review) => ({
    id: review.id,
    status: review.status,
    rating: review.rating,
    title: review.title,
    body: review.body,
    displayName: review.displayName,
    city: review.city,
    submittedAt: submittedFormatter.format(review.createdAt),
    productName: review.product.name,
    productSlug: review.product.slug,
    orderId: review.order.id,
    orderNumber: review.order.orderNumber,
    buyerName: review.order.shipRecipientName,
    rejectReason: review.rejectReason,
    ownerReply: review.ownerReply,
  }));

  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <header>
        <Link href="/admin" className="text-sm text-forest-700 hover:text-forest-800">
          ← Dashboard
        </Link>
        <h1 className="mt-1 font-display text-2xl font-semibold text-forest-900">Reviews</h1>
        <p className="mt-1 text-sm text-stone">
          From verified buyers only. Publish honest reviews — good or bad. Hold one back only if it breaks a
          posting rule, and answer criticism with a public reply.
        </p>
      </header>

      <nav aria-label="Review status" className="mt-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            href={`/admin/reviews?status=${tab.status}`}
            aria-current={tab.status === status ? 'page' : undefined}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm',
              tab.status === status
                ? 'border-forest-800 bg-forest-800 text-white'
                : 'border-forest-200 bg-white text-forest-800 hover:bg-forest-50',
            )}
          >
            {tab.label}
            {tab.status === ReviewStatus.PENDING && pending > 0 && (
              <span className="rounded-full bg-gold px-1.5 text-xs font-semibold text-forest-900">{pending}</span>
            )}
          </Link>
        ))}
      </nav>

      {cards.length === 0 ? (
        <p className="mt-6 rounded-2xl border border-forest-100 bg-white p-6 text-sm text-stone">
          {status === ReviewStatus.PENDING
            ? 'No reviews waiting. After you mark an order delivered, send the buyer their review link from the order page.'
            : 'Nothing here yet.'}
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {cards.map((card) => (
            <ReviewModerationCard key={card.id} review={card} />
          ))}
        </div>
      )}
    </main>
  );
}
