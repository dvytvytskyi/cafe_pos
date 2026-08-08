import { prisma } from '../lib/db.ts';
import {
  ReputationValidationError,
  sanitizeReplyText,
  validateRating,
  type ReviewListFilters,
  type ReviewSource,
} from '../lib/reputation-validation.ts';
import { publishGoogleReviewReply } from '../lib/reputation-google-client.ts';

export type CustomerReviewRecord = {
  id: string;
  source: ReviewSource;
  rating: number;
  authorName: string;
  comment: string | null;
  replyText: string | null;
  repliedAt: Date | null;
  locationId: string;
  externalId: string | null;
  reviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type ReviewSummary = {
  source: ReviewSource;
  averageRating: number;
  totalReviews: number;
};

const SEED_REVIEWS: Array<{
  source: ReviewSource;
  rating: number;
  authorName: string;
  comment: string;
  locationId: string;
  reviewDate: Date;
}> = [
  {
    source: 'GOOGLE',
    rating: 5,
    authorName: 'Elena Rodriguez',
    comment: 'Absolutely love the new Corgi Cafe! The avocado toast is to die for.',
    locationId: 'default',
    reviewDate: new Date(Date.now() - 2 * 86400000),
  },
  {
    source: 'GOOGLE',
    rating: 4,
    authorName: 'Mark T.',
    comment: 'Great atmosphere and good coffee. Prices are a bit high, but quality justifies it.',
    locationId: 'default',
    reviewDate: new Date(Date.now() - 7 * 86400000),
  },
  {
    source: 'TRIPADVISOR',
    rating: 5,
    authorName: 'Sophie L.',
    comment: 'Best matcha latte in the city! The corgi mascot is adorable.',
    locationId: 'default',
    reviewDate: new Date(Date.now() - 3 * 86400000),
  },
  {
    source: 'TRIPADVISOR',
    rating: 3,
    authorName: 'David Chen',
    comment: 'Coffee was good but we had to wait 20 minutes for a table on Sunday.',
    locationId: 'default',
    reviewDate: new Date(Date.now() - 14 * 86400000),
  },
  {
    source: 'GOOGLE',
    rating: 1,
    authorName: 'Browser Test Guest',
    comment: 'Disappointed with the wait time during rush hour.',
    locationId: 'default',
    reviewDate: new Date(Date.now() - 1 * 86400000),
  },
];

function mapRow(row: {
  id: string;
  source: string;
  rating: number;
  authorName: string;
  comment: string | null;
  replyText: string | null;
  repliedAt: Date | null;
  locationId: string;
  externalId: string | null;
  reviewDate: Date;
  createdAt: Date;
  updatedAt: Date;
}): CustomerReviewRecord {
  return {
    id: row.id,
    source: row.source as ReviewSource,
    rating: row.rating,
    authorName: row.authorName,
    comment: row.comment,
    replyText: row.replyText,
    repliedAt: row.repliedAt,
    locationId: row.locationId,
    externalId: row.externalId,
    reviewDate: row.reviewDate,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class ReputationRepository {
  async ensureSeedData(locationId = 'default'): Promise<void> {
    const count = await prisma.customerReview.count({ where: { locationId } });
    if (count > 0) return;

    await prisma.customerReview.createMany({
      data: SEED_REVIEWS.map((r) => ({
        ...r,
        externalId: `mock-${r.source.toLowerCase()}-${r.authorName.replace(/\s+/g, '-').toLowerCase()}`,
      })),
    });
  }

  async findReviews(filters: ReviewListFilters): Promise<{ items: CustomerReviewRecord[]; total: number }> {
    const locationId = filters.locationId ?? 'default';
    await this.ensureSeedData(locationId);

    const where: { source?: string; locationId?: string } = { locationId };
    if (filters.source) where.source = filters.source;

    const [rows, total] = await Promise.all([
      prisma.customerReview.findMany({
        where,
        orderBy: { reviewDate: 'desc' },
        take: filters.limit ?? 50,
        skip: filters.offset ?? 0,
      }),
      prisma.customerReview.count({ where }),
    ]);

    return { items: rows.map(mapRow), total };
  }

  async getSummaries(locationId = 'default'): Promise<ReviewSummary[]> {
    await this.ensureSeedData(locationId);

    const grouped = await prisma.customerReview.groupBy({
      by: ['source'],
      where: { locationId },
      _avg: { rating: true },
      _count: { id: true },
    });

    return grouped.map((g) => ({
      source: g.source as ReviewSource,
      averageRating: Math.round((g._avg.rating ?? 0) * 10) / 10,
      totalReviews: g._count.id,
    }));
  }

  async replyToReview(reviewId: string, replyTextRaw: unknown): Promise<CustomerReviewRecord> {
    const replyText = sanitizeReplyText(replyTextRaw);

    const review = await prisma.customerReview.findUnique({ where: { id: reviewId } });
    if (!review) {
      throw new ReputationValidationError('Review not found');
    }
    if (review.replyText) {
      throw new ReputationValidationError('Review already has a reply');
    }

    if (review.source === 'GOOGLE') {
      const publishResult = await publishGoogleReviewReply(reviewId, review.externalId, replyText);
      if (!publishResult.success) {
        throw new ReputationValidationError('Failed to publish reply to Google');
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      return tx.customerReview.update({
        where: { id: reviewId },
        data: {
          replyText,
          repliedAt: new Date(),
        },
      });
    });

    return mapRow(updated);
  }

  async createReview(input: {
    source: string;
    rating: unknown;
    authorName: string;
    comment?: string | null;
    locationId?: string;
    externalId?: string | null;
    reviewDate?: Date;
  }): Promise<CustomerReviewRecord> {
    const rating = validateRating(input.rating);
    const source = input.source?.trim().toUpperCase();
    if (!source || !['GOOGLE', 'TRIPADVISOR', 'YELP'].includes(source)) {
      throw new ReputationValidationError('Invalid review source');
    }
    const authorName = input.authorName?.trim();
    if (!authorName || authorName.length > 100) {
      throw new ReputationValidationError('authorName is required (max 100 chars)');
    }

    const row = await prisma.customerReview.create({
      data: {
        source,
        rating,
        authorName,
        comment: input.comment?.trim() || null,
        locationId: input.locationId ?? 'default',
        externalId: input.externalId ?? null,
        reviewDate: input.reviewDate ?? new Date(),
      },
    });

    return mapRow(row);
  }
}

export const reputationRepository = new ReputationRepository();
