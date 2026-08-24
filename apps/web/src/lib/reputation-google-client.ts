/**
 * Google reviews / reply client.
 * - Reply publish: mock until OAuth Business Profile is wired.
 * - Review fetch: Google Places API (New) when GOOGLE_PLACES_API_KEY is set, else mock mode.
 */

export type GooglePublishResult = {
  success: true;
  externalReplyId: string;
};

export type GoogleReviewPayload = {
  externalId: string;
  rating: number;
  authorName: string;
  comment: string | null;
  locationId: string;
  reviewDate: string;
  replyText?: string | null;
  repliedAt?: string | null;
};

export type GoogleReviewsSyncMode = 'live' | 'mock' | 'disabled';

export type GoogleReviewsSyncConfig = {
  mode: GoogleReviewsSyncMode;
  apiKey: string | null;
  placeIds: Record<string, string>;
};

let lastPublishCall: { reviewId: string; externalId: string | null; replyText: string } | null = null;

export function getLastGooglePublishCall() {
  return lastPublishCall;
}

export function resetGooglePublishCall() {
  lastPublishCall = null;
}

export async function publishGoogleReviewReply(
  reviewId: string,
  externalId: string | null,
  replyText: string
): Promise<GooglePublishResult> {
  lastPublishCall = { reviewId, externalId, replyText };
  await new Promise((resolve) => setTimeout(resolve, 5));
  return {
    success: true,
    externalReplyId: `mock-reply-${reviewId.slice(0, 8)}`,
  };
}

function parsePlaceIds(raw: string | undefined): Record<string, string> {
  if (!raw?.trim()) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    const out: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.trim()) out[key] = value.trim();
    }
    return out;
  } catch {
    return {};
  }
}

export function getGoogleReviewsSyncConfig(): GoogleReviewsSyncConfig {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY?.trim() || process.env.GOOGLE_MAPS_API_KEY?.trim() || null;
  const placeIds = parsePlaceIds(process.env.GOOGLE_PLACE_IDS);
  const modeEnv = (process.env.GOOGLE_REVIEWS_SYNC_MODE ?? '').trim().toLowerCase();

  if (modeEnv === 'mock') {
    return { mode: 'mock', apiKey, placeIds };
  }
  if (apiKey && Object.keys(placeIds).length > 0) {
    return { mode: 'live', apiKey, placeIds };
  }
  if (modeEnv === 'live') {
    return { mode: 'disabled', apiKey, placeIds };
  }
  if (process.env.NODE_ENV !== 'production') {
    return { mode: 'mock', apiKey, placeIds };
  }
  return { mode: 'disabled', apiKey, placeIds };
}

function mockGoogleReviews(locationId?: string): GoogleReviewPayload[] {
  const now = Date.now();
  const days = (n: number) => new Date(now - n * 86400000).toISOString();
  const loc = locationId && locationId !== 'all' ? locationId : 'loc-gotico';

  return [
    {
      externalId: `google-live-mock-${loc}-001`,
      rating: 5,
      authorName: 'Live Sync Demo',
      comment: 'Pulled via mock Google sync — configure GOOGLE_PLACES_API_KEY for real reviews.',
      locationId: loc,
      reviewDate: days(1),
    },
    {
      externalId: `google-live-mock-${loc}-002`,
      rating: 4,
      authorName: 'Maria S.',
      comment: 'Great cortado and friendly staff.',
      locationId: loc,
      reviewDate: days(4),
    },
  ];
}

type PlacesReview = {
  name?: string;
  rating?: number;
  text?: { text?: string };
  originalText?: { text?: string };
  authorAttribution?: { displayName?: string };
  publishTime?: string;
};

async function fetchPlaceReviews(
  placeId: string,
  apiKey: string,
  locationId: string
): Promise<GoogleReviewPayload[]> {
  const url = `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`;
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': apiKey,
      'X-Goog-FieldMask': 'reviews',
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google Places API error (${res.status}): ${body.slice(0, 200)}`);
  }

  const data = (await res.json()) as { reviews?: PlacesReview[] };
  const reviews = data.reviews ?? [];

  return reviews.map((review, index) => {
    const externalId =
      review.name?.split('/').pop() ||
      `google-${placeId.slice(-8)}-${index}`;
    const comment = review.text?.text?.trim() || review.originalText?.text?.trim() || null;
    return {
      externalId,
      rating: Math.min(5, Math.max(1, Math.round(review.rating ?? 5))),
      authorName: (review.authorAttribution?.displayName?.trim() || 'Google User').slice(0, 100),
      comment,
      locationId,
      reviewDate: review.publishTime ?? new Date().toISOString(),
    };
  });
}

export async function fetchGoogleReviews(options: {
  locationId?: string;
  placeIds: Record<string, string>;
  apiKey: string | null;
  mode: 'live' | 'mock';
}): Promise<GoogleReviewPayload[]> {
  if (options.mode === 'mock') {
    return mockGoogleReviews(options.locationId);
  }

  if (!options.apiKey) {
    throw new Error('GOOGLE_PLACES_API_KEY is required for live sync');
  }

  const targetLocationId = options.locationId && options.locationId !== 'all' ? options.locationId : undefined;
  const entries = targetLocationId
    ? Object.entries(options.placeIds).filter(([locId]) => locId === targetLocationId)
    : Object.entries(options.placeIds);

  if (!entries.length) {
    throw new Error(
      targetLocationId
        ? `No Google place id configured for location "${targetLocationId}" in GOOGLE_PLACE_IDS`
        : 'GOOGLE_PLACE_IDS is empty'
    );
  }

  const all: GoogleReviewPayload[] = [];
  for (const [locationId, placeId] of entries) {
    const rows = await fetchPlaceReviews(placeId, options.apiKey, locationId);
    all.push(...rows);
  }
  return all;
}
