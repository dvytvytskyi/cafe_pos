/**
 * Module 27 — Taxes browser test (T27.7 alcohol 21→22% via settings UI)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { gotoPage, launchTestBrowser, setReactInput } from './browser-test-utils.ts';

const BASE = 'http://localhost:3000';

async function resetRates() {
  await fetch(`${BASE}/api/taxes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rates: [
        { slug: 'food', ratePercent: 10 },
        { slug: 'alcohol', ratePercent: 21 },
      ],
    }),
  });
}

async function run() {
  console.log('--- Module 27 Taxes Browser Tests ---');
  await resetRates();

  const browser = await launchTestBrowser();
  const page = await browser.newPage();

  try {
    await gotoPage(page, '/settings');
    await page.evaluate(() => localStorage.setItem('corgi_active_menu', 'receipts'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="taxes-panel"]', { timeout: 30000 });

    await setReactInput(page, '[data-testid="tax-rate-alcohol"]', '22');

    const saveResponse = page.waitForResponse(
      (res) => res.url().includes('/api/taxes') && res.request().method() === 'PUT' && res.status() === 200,
      { timeout: 15000 }
    );
    await page.click('[data-testid="taxes-save-btn"]');
    await saveResponse;

    await page.waitForSelector('[data-testid="taxes-saved"]', { timeout: 10000 });
    console.log('✅ T27.7 alcohol rate 21→22% saved via UI');

    const alcoholRow = await prisma.taxRate.findFirst({ where: { slug: 'alcohol', locationId: 'default' } });
    if (!alcoholRow || alcoholRow.ratePercent !== 22) {
      throw new Error(`DB alcohol rate expected 22, got ${alcoholRow?.ratePercent}`);
    }
    console.log('✅ alcohol 22% persisted in DB');

    const calc = await page.evaluate(async () => {
      const res = await fetch('/api/taxes/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: [{ name: 'Craft Beer', price: 12, quantity: 1 }],
        }),
      });
      return res.json();
    });

    if (calc.rates?.alcohol !== 22) {
      throw new Error(`Calculate API expected alcohol 22%, got ${calc.rates?.alcohol}`);
    }
    console.log('✅ receipt calc uses 22% alcohol rate from DB');
  } finally {
    await browser.close();
    await resetRates();
    await disconnectDb();
  }

  console.log('--- Module 27 Taxes Browser Tests Passed ---');
}

run().catch(async (err) => {
  console.error('❌', err);
  await resetRates().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
