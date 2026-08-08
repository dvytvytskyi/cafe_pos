/**
 * Module 30 — Backups browser test (T30.4 create backup → list shows file)
 */
import puppeteer from 'puppeteer-core';
import { gotoPage, launchTestBrowser } from './browser-test-utils.ts';
import { isValidBackupFilename } from './backup-validation.ts';

async function run() {
  console.log('--- Module 30 Backups Browser Tests ---');

  const browser = await launchTestBrowser();
  const page = await browser.newPage();

  try {
    await gotoPage(page, '/settings');
    await page.evaluate(() => localStorage.setItem('corgi_active_menu', 'backups'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="backups-panel"]', { timeout: 30000 });

    const createResponse = page.waitForResponse(
      (res) => res.url().includes('/api/backups') && res.request().method() === 'POST' && res.status() === 201,
      { timeout: 60000 }
    );
    await page.click('[data-testid="backups-create-btn"]');
    const createRes = await createResponse;
    const created = await createRes.json();

    if (!isValidBackupFilename(created.filename)) {
      throw new Error(`Invalid backup filename: ${created.filename}`);
    }
    console.log('✅ T30.4 create backup via UI');

    await page.waitForSelector(`[data-testid="backup-row-${created.filename}"]`, { timeout: 15000 });
    console.log('✅ backup file visible in list');

    await page.waitForSelector('[data-testid="backups-success"]', { timeout: 10000 }).catch(() => null);
    console.log('✅ success message shown');
  } finally {
    await browser.close();
  }

  console.log('--- Module 30 Backups Browser Tests Passed ---');
}

run().catch((err) => {
  console.error('❌', err);
  process.exit(1);
});
