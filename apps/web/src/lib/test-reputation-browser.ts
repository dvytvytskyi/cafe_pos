/**
 * Module 31 — Reputation browser test (T31.4 reply to 1-star → Replied badge)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { gotoPage, launchTestBrowser } from './browser-test-utils.ts';

const PREFIX = 'M31-Browser';

async function cleanup() {
  await prisma.customerReview.deleteMany({
    where: { authorName: { startsWith: PREFIX } },
  });
}

async function run() {
  console.log('--- Module 31 Reputation Browser Tests ---');
  await cleanup();

  const review = await prisma.customerReview.create({
    data: {
      source: 'GOOGLE',
      rating: 1,
      authorName: `${PREFIX}-OneStar`,
      comment: 'Terrible experience during lunch rush.',
      locationId: 'default',
      externalId: 'mock-browser-test',
    },
  });

  const browser = await launchTestBrowser();
  const page = await browser.newPage();

  try {
    await gotoPage(page, '/settings');
    await page.evaluate(() => localStorage.setItem('corgi_active_menu', 'reputation'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="reputation-view"]', { timeout: 30000 });

    await page.waitForSelector(`[data-testid="review-row-${review.id}"]`, { timeout: 15000 });
    console.log('✅ review visible in list');

    await page.click(`[data-testid="review-reply-btn-${review.id}"]`);
    await page.waitForSelector(`[data-testid="review-reply-form-${review.id}"]`);

    const replyText = 'We sincerely apologize and are working to improve wait times.';
    await page.type(`[data-testid="review-reply-input-${review.id}"]`, replyText);

    const replyResponse = page.waitForResponse(
      (res) =>
        res.url().includes(`/api/reputation/reviews/${review.id}/reply`) &&
        res.request().method() === 'POST' &&
        res.status() === 200,
      { timeout: 15000 }
    );
    await page.click(`[data-testid="review-reply-submit-${review.id}"]`);
    await replyResponse;
    console.log('✅ T31.4 reply submitted via UI');

    await page.waitForSelector(`[data-testid="review-replied-badge-${review.id}"]`, { timeout: 10000 });
    console.log('✅ T31.4 Replied badge visible');

    const badgeText = await page.$eval(
      `[data-testid="review-replied-badge-${review.id}"]`,
      (el) => el.textContent ?? ''
    );
    if (!badgeText.includes('Replied')) {
      throw new Error(`Badge text unexpected: ${badgeText}`);
    }
  } finally {
    await browser.close();
    await cleanup();
    await disconnectDb();
  }

  console.log('--- Module 31 Reputation Browser Tests Passed ---');
}

run().catch(async (err) => {
  console.error('❌', err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
