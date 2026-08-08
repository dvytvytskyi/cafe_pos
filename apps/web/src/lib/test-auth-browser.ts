/**
 * Module 35 — Auth browser tests (T35.8 wrong PIN toast, T35.9 dashboard KPIs)
 */
import { gotoPage, launchTestBrowser } from './browser-test-utils.ts';
import { disconnectDb } from './db.ts';
import { cache } from './cache/index.ts';

async function run() {
  console.log('--- Module 35 Auth Browser Tests ---');
  await cache.delete('auth:pin-fail:127.0.0.1');

  const browser = await launchTestBrowser();
  const page = await browser.newPage();

  try {
    await gotoPage(page, '/');
    await page.waitForSelector('[data-testid="pin-login-screen"]', { timeout: 30000 });

    for (const d of ['0', '0', '0', '0']) {
      await page.click(`[data-testid="pin-key-${d}"]`);
    }
    await page.waitForSelector('[data-testid="pin-login-error"]', { timeout: 10000 });
    console.log('✅ T35.8 wrong PIN toast shown');

    await page.click('[data-testid="pin-key-clear"]');
    await page.click('[data-testid="pin-key-clear"]');
    await page.click('[data-testid="pin-key-clear"]');
    await page.click('[data-testid="pin-key-clear"]');

    for (const d of ['1', '2', '3', '4']) {
      await page.click(`[data-testid="pin-key-${d}"]`);
    }

    await page.waitForSelector('[data-testid="home-page"]', { timeout: 30000 });
    await page.waitForSelector('[data-testid="home-kpi-orders"]', { timeout: 15000 });
    await page.waitForSelector('[data-testid="active-tables-card"], [data-testid="dashboard-layout"]', {
      timeout: 15000,
    });
    console.log('✅ T35.9 correct PIN → dashboard with live KPIs');

    console.log('--- Module 35 Auth Browser Tests Passed ---');
  } finally {
    await browser.close();
    await disconnectDb();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
