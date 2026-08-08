/**
 * Module 28 — Gift cards browser test (T28.6 issue card + disable via UI)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { isValidGiftCardCode } from './gift-card-validation.ts';
import { gotoPage, launchTestBrowser } from './browser-test-utils.ts';

async function openGiftCardsTab(page: import('puppeteer-core').Page) {
  await gotoPage(page, '/settings');
  await page.evaluate(() => {
    localStorage.setItem('corgi_active_menu', 'discounts');
  });
  await page.reload({ waitUntil: 'load' });
  await page.waitForSelector('[data-testid="discounts-subtab-giftcards"]', { timeout: 30000 });
  await page.click('[data-testid="discounts-subtab-giftcards"]');
  await page.waitForSelector('[data-testid="giftcards-panel"]', { timeout: 15000 });
}

async function cleanup() {
  const recent = new Date(Date.now() - 3600000);
  await prisma.giftCard.deleteMany({
    where: { createdAt: { gte: recent }, balance: 50, initialBalance: 50 },
  }).catch(() => {});
}

async function run() {
  console.log('--- Module 28 Gift Cards Browser Tests ---');

  const browser = await launchTestBrowser();
  const page = await browser.newPage();

  try {
    await openGiftCardsTab(page);

    await page.click('[data-testid="giftcards-issue-btn"]');
    await page.waitForSelector('[data-testid="giftcards-generate-btn"]', { timeout: 10000 });

    const createResponse = page.waitForResponse(
      (res) => res.url().includes('/api/giftcards') && res.request().method() === 'POST' && res.status() === 201,
      { timeout: 15000 }
    );
    await page.click('[data-testid="giftcards-generate-btn"]');
    const createRes = await createResponse;
    const created = await createRes.json();

    if (!isValidGiftCardCode(created.code)) {
      throw new Error(`Invalid code format: ${created.code}`);
    }
    console.log('✅ T28.6 issue gift card via UI → valid code in DB');

    const dbRow = await prisma.giftCard.findUnique({ where: { id: created.id } });
    if (!dbRow || dbRow.balance !== 50) {
      throw new Error('Gift card not persisted correctly');
    }
    console.log('✅ gift card persisted in DB');

    await page.click('[data-testid="giftcards-issue-btn"]');
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="giftcards-generate-btn"]'),
      { timeout: 5000 }
    ).catch(() => {});

    const toggle = await page.waitForSelector(`[data-testid="giftcard-toggle-${created.id}"]`, { timeout: 15000 });
    const patchResponse = page.waitForResponse(
      (res) => res.url().includes(`/api/giftcards/${created.id}`) && res.request().method() === 'PATCH',
      { timeout: 15000 }
    );
    await toggle!.click();
    await patchResponse;

    await page.waitForFunction(
      (id) => {
        const row = document.querySelector(`[data-testid="giftcard-toggle-${id}"]`);
        return row?.textContent?.includes('Activate');
      },
      { timeout: 10000 },
      created.id
    );
    console.log('✅ disable card via UI → PATCH persisted');

    const disabled = await prisma.giftCard.findUnique({ where: { id: created.id } });
    if (disabled?.status !== 'disabled') {
      throw new Error(`Expected disabled status, got ${disabled?.status}`);
    }
    console.log('✅ card status disabled in DB');

    await prisma.giftCard.delete({ where: { id: created.id } }).catch(() => {});
  } finally {
    await browser.close();
    await disconnectDb();
  }

  console.log('--- Module 28 Gift Cards Browser Tests Passed ---');
}

run().catch(async (err) => {
  console.error('❌', err);
  await disconnectDb().catch(() => {});
  process.exit(1);
});
