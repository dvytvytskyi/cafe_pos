/**
 * Mock Google Business Profile client (OAuth deferred — M31).
 * Replace with real API integration when credentials are available.
 */

export type GooglePublishResult = {
  success: true;
  externalReplyId: string;
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
