import { NextResponse } from 'next/server';
import { reputationRepository } from '@/repositories/reputation.repository';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';
import { ReputationValidationError, parseReviewFilters } from '@/lib/reputation-validation';

function formatReview(review: {
  id: string;
  source: string;
  rating: number;
  authorName: string;
  comment: string | null;
  replyText: string | null;
  repliedAt: Date | null;
  locationId: string;
  reviewDate: Date;
}) {
  return {
    id: review.id,
    source: review.source,
    rating: review.rating,
    authorName: review.authorName,
    comment: review.comment,
    replyText: review.replyText,
    repliedAt: review.repliedAt,
    locationId: review.locationId,
    reviewDate: review.reviewDate,
    status: review.replyText ? 'replied' : 'new',
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = parseReviewFilters(searchParams);
    const locationId = filters.locationId ?? DEFAULT_LOCATION_ID;
    const [{ items, total }, summaries] = await Promise.all([
      reputationRepository.findReviews(filters),
      reputationRepository.getSummaries(locationId),
    ]);

    return NextResponse.json(
      {
        items: items.map(formatReview),
        total,
        limit: filters.limit,
        offset: filters.offset,
        summaries,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof ReputationValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/reputation/reviews error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
