/**
 * Module 31 — reputation integration tests
 */
import { prisma, disconnectDb } from './db.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M31-Integration';

async function cleanup() {
  await prisma.customerReview.deleteMany({
    where: { authorName: { startsWith: PREFIX } },
  });
}

async function main() {
  console.log('--- Module 31 Reputation Integration Tests ---');
  await cleanup();

  const review = await prisma.customerReview.create({
    data: {
      source: 'GOOGLE',
      rating: 1,
      authorName: `${PREFIX}-Guest`,
      comment: 'Very long wait time.',
      locationId: 'default',
      externalId: 'mock-google-test-001',
    },
  });

  const badRating = await fetch(`${BASE}/api/reputation/reviews/${review.id}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyText: '<script>x</script>We are sorry for the wait.' }),
  });
  if (badRating.status !== 200) {
    console.error('❌ reply with HTML should succeed after sanitize', badRating.status, await badRating.json());
    process.exit(1);
  }
  const replied = await badRating.json();
  if (!replied.replyText?.includes('We are sorry') || replied.replyText.includes('<script>')) {
    console.error('❌ T31.2 reply not sanitized', replied);
    process.exit(1);
  }
  console.log('✅ T31.2 HTML stripped from reply');

  const row = await prisma.customerReview.findUnique({ where: { id: review.id } });
  if (!row?.replyText || !row.repliedAt) {
    console.error('❌ T31.3 replyText/repliedAt not saved in transaction', row);
    process.exit(1);
  }
  console.log('✅ T31.3 replyText and repliedAt saved (Google mock in server process)');

  const duplicate = await fetch(`${BASE}/api/reputation/reviews/${review.id}/reply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ replyText: 'Second reply' }),
  });
  if (duplicate.status !== 400) {
    console.error('❌ duplicate reply expected 400', duplicate.status);
    process.exit(1);
  }
  console.log('✅ duplicate reply → 400');

  const listRes = await fetch(`${BASE}/api/reputation/reviews?source=GOOGLE&limit=5`);
  const listBody = await listRes.json();
  if (listRes.status !== 200 || !Array.isArray(listBody.items) || !listBody.summaries) {
    console.error('❌ GET reviews failed', listRes.status, listBody);
    process.exit(1);
  }
  console.log('✅ GET /api/reputation/reviews with summaries');

  const badFilter = await fetch(`${BASE}/api/reputation/reviews?source=INVALID`);
  if (badFilter.status !== 400) {
    console.error('❌ invalid source filter expected 400');
    process.exit(1);
  }
  console.log('✅ invalid source filter → 400');

  await cleanup();
  await disconnectDb();
  console.log('--- Module 31 Integration Tests Passed ---');
}

main().catch(async (err) => {
  console.error('❌', err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
