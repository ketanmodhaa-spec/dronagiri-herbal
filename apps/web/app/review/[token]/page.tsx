/**
 * /review/[token] — a buyer reviews the products from one delivered order.
 *
 * Reached only through the signed link sent after delivery: the token is the
 * proof of purchase, so there is no login and nothing for a bot to fill in
 * without one. Never indexed.
 */
import type { Metadata } from 'next';
import Link from 'next/link';

import { ReviewForm } from '@/components/reviews/review-form';
import { StarRating } from '@/components/reviews/star-rating';
import { SiteFooter } from '@/components/shop/site-footer';
import { SiteHeader } from '@/components/shop/site-header';
import { Container } from '@/components/ui/container';
import { getInvitation, type InvitationState } from '@/lib/reviews/review-service';

export const metadata: Metadata = {
  title: 'Review your order',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

const CLOSED_COPY: Record<Exclude<InvitationState['kind'], 'open'>, string> = {
  invalid: 'This review link is not valid. Please use the link from your order message.',
  'not-delivered': 'You can review this order once it has been delivered.',
  expired: 'This review link has expired. Thank you for shopping with us!',
};

export default async function ReviewPage(props: { params: Promise<{ token: string }> }) {
  const params = await props.params;
  const invitation = await getInvitation(params.token);

  return (
    <>
      <SiteHeader />
      <main className="bg-cream py-12 md:py-16">
        <Container className="max-w-2xl">
          <h1 className="font-display text-3xl font-semibold text-forest-900">Review your order</h1>

          {invitation.kind !== 'open' ? (
            <p className="mt-6 rounded-2xl border border-forest-100 bg-white p-6 text-forest-900">
              {CLOSED_COPY[invitation.kind]}
            </p>
          ) : (
            <>
              <p className="mt-2 text-stone">
                Order {invitation.orderNumber} — thank you for buying from us. Your honest review helps other
                customers, and helps us make better products.
              </p>
              <div className="mt-8 space-y-6">
                {invitation.items.map((item) => (
                  <section key={item.productId} className="rounded-2xl border border-forest-100 bg-white p-5">
                    <h2 className="mb-4 font-display text-xl font-semibold text-forest-900">
                      <Link href={`/products/${item.slug}`} className="hover:underline">
                        {item.name}
                      </Link>
                    </h2>
                    {item.review ? (
                      <p className="flex items-center gap-2 text-sm text-forest-900">
                        <StarRating rating={item.review.rating} />
                        {item.review.status === 'PUBLISHED'
                          ? 'Your review is published — thank you!'
                          : 'Thank you — your review is with us.'}
                      </p>
                    ) : (
                      <ReviewForm
                        token={params.token}
                        productId={item.productId}
                        productName={item.name}
                        suggestedName={invitation.suggestedName}
                        city={invitation.city}
                      />
                    )}
                  </section>
                ))}
              </div>
            </>
          )}
        </Container>
      </main>
      <SiteFooter />
    </>
  );
}
