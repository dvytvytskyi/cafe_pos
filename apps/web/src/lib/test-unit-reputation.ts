/**
 * Module 31 — reputation validation unit tests
 */
import assert from 'assert';
import {
  validateRating,
  sanitizeReplyText,
  parseReviewFilters,
  stripHtmlTags,
  ReputationValidationError,
  MAX_REPLY_LENGTH,
} from './reputation-validation.ts';
import {
  publishGoogleReviewReply,
  getLastGooglePublishCall,
  resetGooglePublishCall,
  getGoogleReviewsSyncConfig,
} from './reputation-google-client.ts';

async function main() {
  console.log('--- Module 31 Reputation Unit Tests ---');

  console.log('✅ T31.1 valid ratings 1-5');
  assert.strictEqual(validateRating(1), 1);
  assert.strictEqual(validateRating(5), 5);
  assert.strictEqual(validateRating('3'), 3);

  console.log('✅ T31.1 invalid ratings rejected');
  assert.throws(() => validateRating(0), ReputationValidationError);
  assert.throws(() => validateRating(6), ReputationValidationError);
  assert.throws(() => validateRating(3.5), ReputationValidationError);
  assert.throws(() => validateRating('abc'), ReputationValidationError);

  console.log('✅ T31.2 strip HTML from reply');
  assert.strictEqual(stripHtmlTags('<b>Hello</b> world'), 'Hello world');
  assert.strictEqual(stripHtmlTags('<script>alert(1)</script>Thanks'), 'alert(1)Thanks');

  console.log('✅ T31.2 sanitize reply text');
  assert.strictEqual(sanitizeReplyText('  Thank you for visiting!  '), 'Thank you for visiting!');
  assert.strictEqual(sanitizeReplyText('<p>We appreciate your feedback.</p>'), 'We appreciate your feedback.');

  console.log('✅ T31.2 empty and too-long replies rejected');
  assert.throws(() => sanitizeReplyText('   '), ReputationValidationError);
  assert.throws(() => sanitizeReplyText('x'.repeat(MAX_REPLY_LENGTH + 1)), ReputationValidationError);

  console.log('✅ parse review filters');
  const params = new URLSearchParams('source=GOOGLE&limit=20&offset=0');
  const f = parseReviewFilters(params);
  assert.strictEqual(f.source, 'GOOGLE');
  assert.strictEqual(f.limit, 20);

  console.log('✅ invalid source rejected');
  assert.throws(
    () => parseReviewFilters(new URLSearchParams('source=facebook')),
    ReputationValidationError
  );

  console.log('✅ T31.3 mock Google client publishes reply');
  resetGooglePublishCall();
  const result = await publishGoogleReviewReply('review-uuid', 'ext-123', 'Thank you!');
  assert.strictEqual(result.success, true);
  const call = getLastGooglePublishCall();
  assert.ok(call);
  assert.strictEqual(call!.reviewId, 'review-uuid');
  assert.strictEqual(call!.replyText, 'Thank you!');

  console.log('✅ Google sync config mock mode');
  const prevMode = process.env.GOOGLE_REVIEWS_SYNC_MODE;
  process.env.GOOGLE_REVIEWS_SYNC_MODE = 'mock';
  const cfg = getGoogleReviewsSyncConfig();
  assert.strictEqual(cfg.mode, 'mock');
  if (prevMode === undefined) delete process.env.GOOGLE_REVIEWS_SYNC_MODE;
  else process.env.GOOGLE_REVIEWS_SYNC_MODE = prevMode;

  console.log('--- Module 31 Unit Tests Passed ---');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
