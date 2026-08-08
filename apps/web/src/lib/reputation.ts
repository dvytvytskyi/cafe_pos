import type { ReviewSource } from './reputation-validation';

export type CustomerReview = {
  id: string;
  source: ReviewSource;
  rating: number;
  authorName: string;
  comment: string | null;
  replyText: string | null;
  repliedAt: string | null;
  locationId: string;
  reviewDate: string;
  status: 'new' | 'replied';
};

export type ReviewSummary = {
  source: ReviewSource;
  averageRating: number;
  totalReviews: number;
};

export type ReviewsPage = {
  items: CustomerReview[];
  total: number;
  limit: number;
  offset: number;
  summaries: ReviewSummary[];
};

export const REPUTATION_UPDATED_EVENT = 'corgi-reputation-updated';

export class ReputationApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ReputationApiError';
    this.status = status;
  }
}

function mapReview(raw: {
  id: string;
  source: ReviewSource;
  rating: number;
  authorName: string;
  comment: string | null;
  replyText: string | null;
  repliedAt: string | Date | null;
  locationId: string;
  reviewDate: string | Date;
}): CustomerReview {
  return {
    id: raw.id,
    source: raw.source,
    rating: raw.rating,
    authorName: raw.authorName,
    comment: raw.comment,
    replyText: raw.replyText,
    repliedAt: raw.repliedAt ? new Date(raw.repliedAt).toISOString() : null,
    locationId: raw.locationId,
    reviewDate: new Date(raw.reviewDate).toISOString(),
    status: raw.replyText ? 'replied' : 'new',
  };
}

export function notifyReputationUpdated(): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(REPUTATION_UPDATED_EVENT));
}

export async function getReviewsAsync(params?: {
  source?: ReviewSource;
  locationId?: string;
  limit?: number;
  offset?: number;
}): Promise<ReviewsPage> {
  const qs = new URLSearchParams();
  if (params?.source) qs.set('source', params.source);
  if (params?.locationId && params.locationId !== 'All Locations') {
    qs.set('locationId', params.locationId);
  }
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.offset) qs.set('offset', String(params.offset));

  const query = qs.toString();
  const res = await fetch(`/api/reputation/reviews${query ? `?${query}` : ''}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ReputationApiError(body.error ?? 'Failed to load reviews', res.status);
  }

  return {
    ...body,
    items: (body.items ?? []).map(mapReview),
  };
}

export async function replyToReviewAsync(reviewId: string, replyText: string): Promise<CustomerReview> {
  const res = await fetch(`/api/reputation/reviews/${reviewId}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyText }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ReputationApiError(body.error ?? 'Failed to post reply', res.status);
  }
  notifyReputationUpdated();
  return mapReview(body);
}

export function formatReviewDate(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / 86400000);
  if (days <= 0) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return '1 month ago';
}

export function sourceLabel(source: ReviewSource): string {
  if (source === 'GOOGLE') return 'Google';
  if (source === 'TRIPADVISOR') return 'TripAdvisor';
  return 'Yelp';
}
