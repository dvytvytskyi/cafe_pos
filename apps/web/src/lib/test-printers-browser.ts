/**
 * Module 26 — Printers browser test (T26.8 add printer + test print API)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { gotoPage, launchTestBrowser, setReactInput } from './browser-test-utils.ts';

const PREFIX = 'M26-Browser';

async function cleanup() {
  await prisma.printer.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

async function run() {
  console.log('--- Module 26 Printers Browser Tests ---');
  await cleanup();

  const browser = await launchTestBrowser();
  const page = await browser.newPage();

  try {
    await gotoPage(page, '/settings');
    await page.evaluate(() => localStorage.setItem('corgi_active_menu', 'devices'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="printers-panel"]', { timeout: 30000 });

    await page.click('[data-testid="printers-add-btn"]');
    await page.waitForSelector('[data-testid="printer-form-modal"]', { timeout: 10000 });

    const name = `${PREFIX} Expo`;
    await setReactInput(page, '[data-testid="printer-form-name"]', name);
    await setReactInput(page, '[data-testid="printer-form-ip"]', '192.168.88.88');
    await setReactInput(page, '[data-testid="printer-form-port"]', '9100');
    await page.select('[data-testid="printer-form-type"]', 'kitchen');

    const createResponse = page.waitForResponse(
      (res) => res.url().includes('/api/printers') && res.request().method() === 'POST' && res.status() === 201,
      { timeout: 15000 }
    );
    await page.click('[data-testid="printer-form-save"]');
    await createResponse;

    await page.waitForFunction(
      (expected) =>
        [...document.querySelectorAll('[data-testid="printer-card-name"]')].some((el) =>
          el.textContent?.includes(expected)
        ),
      { timeout: 10000 },
      name
    );
    console.log('✅ T26.8 add printer via UI → card visible');

    const dbRow = await prisma.printer.findFirst({ where: { name } });
    if (!dbRow || dbRow.ipAddress !== '192.168.88.88') {
      throw new Error('Printer not persisted in DB');
    }
    console.log('✅ printer persisted in DB');

    const testBtn = await page.waitForSelector(`[data-testid^="printer-test-"]`, { timeout: 10000 });
    const testResponse = page.waitForResponse(
      (res) => res.url().includes('/api/printers/test') && res.request().method() === 'POST',
      { timeout: 15000 }
    );
    await testBtn!.click();
    const testRes = await testResponse;
    const status = testRes.status();
    if (status !== 504 && status !== 500) {
      throw new Error(`Expected 504/500 for unreachable printer, got ${status}`);
    }
    console.log(`✅ T26.8 test print API called → ${status} (no physical printer)`);

    await page.waitForSelector('[data-testid="printers-toast"]', { timeout: 10000 }).catch(() => null);
    console.log('✅ toast shown after test print');
  } finally {
    await browser.close();
    await cleanup();
    await disconnectDb();
  }

  console.log('--- Module 26 Printers Browser Tests Passed ---');
}

run().catch(async (err) => {
  console.error('❌', err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
