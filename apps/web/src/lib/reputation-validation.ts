export const REVIEW_SOURCES = ['GOOGLE', 'TRIPADVISOR', 'YELP'] as const;
export type ReviewSource = (typeof REVIEW_SOURCES)[number];

export const MIN_RATING = 1;
export const MAX_RATING = 5;
export const MAX_REPLY_LENGTH = 1000;

export class ReputationValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReputationValidationError';
  }
}

export function isValidReviewSource(value: string): value is ReviewSource {
  return (REVIEW_SOURCES as readonly string[]).includes(value);
}

export function validateRating(value: unknown): number {
  const num = typeof value === 'string' ? Number.parseInt(value, 10) : Number(value);
  if (!Number.isInteger(num) || num < MIN_RATING || num > MAX_RATING) {
    throw new ReputationValidationError(`Rating must be an integer between ${MIN_RATING} and ${MAX_RATING}`);
  }
  return num;
}

export function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

export function sanitizeReplyText(value: unknown): string {
  if (typeof value !== 'string') {
    throw new ReputationValidationError('replyText must be a string');
  }
  const trimmed = stripHtmlTags(value).trim();
  if (trimmed.length === 0) {
    throw new ReputationValidationError('replyText cannot be empty');
  }
  if (trimmed.length > MAX_REPLY_LENGTH) {
    throw new ReputationValidationError(`replyText must be at most ${MAX_REPLY_LENGTH} characters`);
  }
  return trimmed;
}

export type ReviewListFilters = {
  source?: ReviewSource;
  locationId?: string;
  limit?: number;
  offset?: number;
};

export function parseReviewFilters(searchParams: URLSearchParams): ReviewListFilters {
  const filters: ReviewListFilters = {};

  const source = searchParams.get('source')?.trim().toUpperCase();
  if (source) {
    if (!isValidReviewSource(source)) {
      throw new ReputationValidationError(`Invalid source. Allowed: ${REVIEW_SOURCES.join(', ')}`);
    }
    filters.source = source;
  }

  const locationId = searchParams.get('locationId')?.trim();
  if (locationId) {
    filters.locationId = locationId.slice(0, 64);
  }

  const limitRaw = searchParams.get('limit');
  if (limitRaw) {
    const limit = Number.parseInt(limitRaw, 10);
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
      throw new ReputationValidationError('limit must be between 1 and 100');
    }
    filters.limit = limit;
  } else {
    filters.limit = 50;
  }

  const offsetRaw = searchParams.get('offset');
  if (offsetRaw) {
    const offset = Number.parseInt(offsetRaw, 10);
    if (!Number.isInteger(offset) || offset < 0) {
      throw new ReputationValidationError('offset must be a non-negative integer');
    }
    filters.offset = offset;
  } else {
    filters.offset = 0;
  }

  return filters;
}
