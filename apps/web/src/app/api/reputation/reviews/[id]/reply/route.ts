import { NextResponse } from 'next/server';
import { reputationRepository } from '@/repositories/reputation.repository';
import { ReputationValidationError } from '@/lib/reputation-validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const updated = await reputationRepository.replyToReview(id, body.replyText);

    return NextResponse.json(
      {
        id: updated.id,
        source: updated.source,
        rating: updated.rating,
        authorName: updated.authorName,
        comment: updated.comment,
        replyText: updated.replyText,
        repliedAt: updated.repliedAt,
        locationId: updated.locationId,
        reviewDate: updated.reviewDate,
        status: 'replied',
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof ReputationValidationError) {
      const status = error.message === 'Review not found' ? 404 : 400;
      return NextResponse.json({ error: error.message }, { status });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('POST /api/reputation/reviews/[id]/reply error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
