/**
 * Reviews — written only by verified buyers, checked by Sarita, shown to
 * everyone.
 *
 *   Invitation   A delivered order's signed link (review-link.ts) is the
 *                only way in: no link, no review. One review per product
 *                per order, for 180 days after delivery.
 *   Moderation   New reviews wait as PENDING. Sarita publishes them, or
 *                rejects one for a posting rule — abusive, personal data, a
 *                medical claim, spam, off-topic. Never for being negative.
 *   Display      Published reviews, most helpful first, with a "Verified
 *                buyer" badge and Sarita's public reply.
 *   Helpful      One thumbs-up per visitor (guest session) per review.
 */
import {
  OrderStatus,
  Prisma,
  prisma,
  ReviewStatus,
  type ReviewRejectReason,
} from '@dronagiri/db';
import type { ReviewSubmit } from '@dronagiri/validators';
import { createHash } from 'node:crypto';

import { serverConfig } from '@/lib/config.server';
import { AppError, NotFoundError } from '@/lib/errors';
import { sendEmail } from '@/lib/notifications/email/client';
import { orderIdFromReviewToken } from '@/lib/reviews/review-link';
import { SITE_URL } from '@/lib/seo/site';

/** A review link works for this long after delivery. */
const REVIEW_WINDOW_DAYS = 180;

/** Statuses of a delivered order — refunds included: unhappy buyers may review too. */
const DELIVERED_STATUSES: OrderStatus[] = [
  OrderStatus.DELIVERED,
  OrderStatus.REFUND_INITIATED,
  OrderStatus.REFUNDED,
];

/** 400/409 — the review cannot be accepted (bad link, already reviewed). */
export class ReviewError extends AppError {
  constructor(message: string, code = 'REVIEW_REJECTED', status = 400) {
    super(code, message, status);
  }
}

/* ─── Invitation ──────────────────────────────────────────────────────── */

export type InvitationState =
  | { kind: 'invalid' }
  | { kind: 'not-delivered' }
  | { kind: 'expired' }
  | {
      kind: 'open';
      orderNumber: string;
      suggestedName: string;
      city: string;
      items: {
        productId: string;
        name: string;
        slug: string;
        review: { status: ReviewStatus; rating: number } | null;
      }[];
    };

/** "Priya Shah" → "Priya S." — a friendly default the reviewer can change. */
function suggestDisplayName(fullName: string): string {
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0]?.toUpperCase() ?? ''}.`;
}

async function loadInvitationOrder(token: string) {
  const orderId = orderIdFromReviewToken(token);
  if (!orderId) return null;
  return prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      deliveredAt: true,
      replacementForId: true,
      customerId: true,
      shipRecipientName: true,
      shipCity: true,
      items: { select: { productId: true, productName: true, productSlug: true } },
      reviews: { select: { productId: true, status: true, rating: true } },
    },
  });
}

type InvitationOrder = NonNullable<Awaited<ReturnType<typeof loadInvitationOrder>>>;

function stateOf(order: InvitationOrder | null): InvitationState {
  if (!order || order.replacementForId) return { kind: 'invalid' };
  if (!order.deliveredAt || !DELIVERED_STATUSES.includes(order.status)) return { kind: 'not-delivered' };
  if (Date.now() - order.deliveredAt.getTime() > REVIEW_WINDOW_DAYS * 24 * 60 * 60 * 1000) {
    return { kind: 'expired' };
  }
  // An order lists each product once (checkout merges lines).
  return {
    kind: 'open',
    orderNumber: order.orderNumber,
    suggestedName: suggestDisplayName(order.shipRecipientName),
    city: order.shipCity,
    items: order.items.map((item) => {
      const review = order.reviews.find((candidate) => candidate.productId === item.productId);
      return {
        productId: item.productId,
        name: item.productName,
        slug: item.productSlug,
        review: review ? { status: review.status, rating: review.rating } : null,
      };
    }),
  };
}

export async function getInvitation(token: string): Promise<InvitationState> {
  return stateOf(await loadInvitationOrder(token));
}

/* ─── Submit ──────────────────────────────────────────────────────────── */

export async function submitReview(input: ReviewSubmit): Promise<void> {
  const order = await loadInvitationOrder(input.token);
  const state = stateOf(order);
  if (state.kind !== 'open' || !order) {
    throw new ReviewError(
      state.kind === 'expired'
        ? 'This review link has expired.'
        : state.kind === 'not-delivered'
          ? 'You can review this order once it has been delivered.'
          : 'This review link is not valid.',
      'INVALID_REVIEW_LINK',
    );
  }
  if (!order.items.some((item) => item.productId === input.productId)) {
    throw new ReviewError('That product is not part of this order.', 'NOT_IN_ORDER');
  }

  try {
    await prisma.review.create({
      data: {
        productId: input.productId,
        orderId: order.id,
        customerId: order.customerId,
        rating: input.rating,
        title: input.title ? input.title : null,
        body: input.body,
        displayName: input.displayName,
        city: input.showCity ? order.shipCity : null,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ReviewError('You have already reviewed this product for this order.', 'ALREADY_REVIEWED', 409);
    }
    throw error;
  }

  const productName = order.items.find((item) => item.productId === input.productId)?.productName ?? 'a product';
  await sendEmail({
    to: serverConfig.email.ownerInbox,
    templateName: 'review_pending',
    orderId: order.id,
    subject: `New ${input.rating}★ review of ${productName} — please check it`,
    text: [
      `${input.displayName} (order ${order.orderNumber}) reviewed ${productName}: ${input.rating} out of 5.`,
      '',
      ...(input.title ? [`"${input.title}"`] : []),
      input.body,
      '',
      `Publish or reject it: ${SITE_URL}/admin/reviews`,
      'Publish honest negative reviews too — reject only for the posting rules.',
    ].join('\n'),
  });
}

/* ─── Public display ──────────────────────────────────────────────────── */

export interface ProductReviewSummary {
  count: number;
  /** One decimal place, e.g. 4.3 — 0 when there are no reviews. */
  average: number;
  /** Count of 5★, 4★, 3★, 2★, 1★ — in that order. */
  distribution: [number, number, number, number, number];
}

export interface PublicReview {
  id: string;
  rating: number;
  title: string | null;
  body: string;
  displayName: string;
  city: string | null;
  createdAt: Date;
  helpfulCount: number;
  ownerReply: string | null;
  ownerReplyAt: Date | null;
}

const PUBLIC_LIST_LIMIT = 30;

export async function getProductReviews(
  productId: string,
): Promise<{ summary: ProductReviewSummary; reviews: PublicReview[] }> {
  const published = { productId, status: ReviewStatus.PUBLISHED };
  const [groups, reviews] = await Promise.all([
    prisma.review.groupBy({ by: ['rating'], where: published, _count: { _all: true } }),
    prisma.review.findMany({
      where: published,
      orderBy: [{ helpfulCount: 'desc' }, { createdAt: 'desc' }],
      take: PUBLIC_LIST_LIMIT,
      select: {
        id: true,
        rating: true,
        title: true,
        body: true,
        displayName: true,
        city: true,
        createdAt: true,
        helpfulCount: true,
        ownerReply: true,
        ownerReplyAt: true,
      },
    }),
  ]);

  const distribution: ProductReviewSummary['distribution'] = [0, 0, 0, 0, 0];
  let count = 0;
  let total = 0;
  for (const group of groups) {
    distribution[5 - group.rating] = group._count._all;
    count += group._count._all;
    total += group.rating * group._count._all;
  }
  return {
    summary: { count, average: count > 0 ? Math.round((total / count) * 10) / 10 : 0, distribution },
    reviews,
  };
}

/* ─── Helpful votes ───────────────────────────────────────────────────── */

/** A visitor's voting identity — a hash of their guest session id, not the id itself. */
function voterKey(sessionId: string): string {
  return createHash('sha256').update(`review-vote:${sessionId}`).digest('hex');
}

/** Add one "helpful" from this visitor. Voting twice changes nothing. */
export async function markHelpful(reviewId: string, sessionId: string): Promise<number> {
  return prisma.$transaction(async (tx) => {
    const review = await tx.review.findUnique({ where: { id: reviewId }, select: { status: true } });
    if (!review || review.status !== ReviewStatus.PUBLISHED) {
      throw new NotFoundError('That review is not available.');
    }
    const inserted = await tx.reviewVote.createMany({
      data: [{ reviewId, voterKey: voterKey(sessionId) }],
      skipDuplicates: true,
    });
    const updated = await tx.review.update({
      where: { id: reviewId },
      data: inserted.count > 0 ? { helpfulCount: { increment: 1 } } : {},
      select: { helpfulCount: true },
    });
    return updated.helpfulCount;
  });
}

/* ─── Admin ───────────────────────────────────────────────────────────── */

export async function listReviewsForAdmin(status: ReviewStatus) {
  return prisma.review.findMany({
    where: { status },
    orderBy: { createdAt: status === ReviewStatus.PENDING ? 'asc' : 'desc' },
    take: 100,
    include: {
      product: { select: { name: true, slug: true } },
      order: { select: { id: true, orderNumber: true, shipRecipientName: true } },
    },
  });
}

export async function countPendingReviews(): Promise<number> {
  return prisma.review.count({ where: { status: ReviewStatus.PENDING } });
}

async function moderate(reviewId: string, data: Prisma.ReviewUpdateInput): Promise<void> {
  try {
    await prisma.review.update({ where: { id: reviewId }, data });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
      throw new NotFoundError('That review no longer exists.');
    }
    throw error;
  }
}

export async function publishReview(reviewId: string, adminId: string): Promise<void> {
  await moderate(reviewId, {
    status: ReviewStatus.PUBLISHED,
    rejectReason: null,
    moderatedBy: adminId,
    moderatedAt: new Date(),
  });
}

export async function rejectReview(reviewId: string, adminId: string, reason: ReviewRejectReason): Promise<void> {
  await moderate(reviewId, {
    status: ReviewStatus.REJECTED,
    rejectReason: reason,
    moderatedBy: adminId,
    moderatedAt: new Date(),
  });
}

/** Sarita's public reply; an empty reply removes it. */
export async function replyToReview(reviewId: string, reply: string): Promise<void> {
  await moderate(reviewId, reply ? { ownerReply: reply, ownerReplyAt: new Date() } : { ownerReply: null, ownerReplyAt: null });
}
