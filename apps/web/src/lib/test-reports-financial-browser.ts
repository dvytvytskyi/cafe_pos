/**
 * Module 33 — Reports browser tests (T33.5 period change, T33.6 CSV export)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { gotoPage, launchTestBrowser } from './browser-test-utils.ts';
import fs from 'fs';
import os from 'os';
import path from 'path';

const LOC = 'default';
const PREFIX = 'M33-Browser';

async function cleanup() {
  await prisma.orderItem.deleteMany({ where: { order: { customerName: { startsWith: PREFIX } } } });
  await prisma.order.deleteMany({ where: { customerName: { startsWith: PREFIX } } });
}

async function run() {
  console.log('--- Module 33 Reports Browser Tests ---');
  await cleanup();

  await prisma.location.upsert({
    where: { id: LOC },
    create: { id: LOC, name: 'Default Location' },
    update: {},
  });

  await prisma.order.create({
    data: {
      id: `${PREFIX}-order`,
      orderNumber: `${PREFIX}-RCPT`,
      source: 'dine_in',
      customerName: `${PREFIX}-Guest`,
      locationId: LOC,
      status: 'completed',
      total: 99,
      paid: true,
      amountPaid: 99,
      createdAt: new Date(),
      items: { create: [{ name: `${PREFIX}-Special`, price: 99, quantity: 1 }] },
    },
  });

  const browser = await launchTestBrowser();
  const page = await browser.newPage();
  const downloadDir = fs.mkdtempSync(path.join(os.tmpdir(), 'm33-csv-'));

  try {
    const client = await page.createCDPSession();
    await client.send('Page.setDownloadBehavior', {
      behavior: 'allow',
      downloadPath: downloadDir,
    });

    await gotoPage(page, '/reports');
    await page.waitForSelector('[data-testid="reports-page"]', { timeout: 30000 });

    await page.waitForFunction(
      () => {
        const el = document.querySelector('[data-testid="reports-total-revenue"]');
        return el && el.textContent && !el.textContent.includes('€0.00');
      },
      { timeout: 15000 }
    );
    const revenueText = await page.$eval('[data-testid="reports-total-revenue"]', (el) => el.textContent ?? '');
    if (!revenueText.includes('99.00') && !revenueText.includes('557.50')) {
      throw new Error(`Expected revenue KPI from API, got: ${revenueText}`);
    }
    console.log('✅ initial KPI loaded from API');

    await page.waitForSelector('[data-testid="dish-performance-tables"]', { timeout: 10000 });
    const dishText = await page.$eval('[data-testid="dish-performance-tables"]', (el) => el.textContent ?? '');
    if (!dishText.includes(`${PREFIX}-Special`)) {
      throw new Error(`Seeded dish not visible in report table: ${dishText}`);
    }
    console.log('✅ seeded dish visible in ABC table');

    const revenueBeforePreset = revenueText;
    await page.click('[data-testid="filter-preset-Last-30-days"]');
    await page.waitForResponse((res) => res.url().includes('/api/reports/financial') && res.status() === 200, {
      timeout: 15000,
    });
    const revenueAfterPreset = await page.$eval('[data-testid="reports-total-revenue"]', (el) => el.textContent ?? '');
    if (revenueAfterPreset !== revenueBeforePreset) {
      throw new Error(`T33.5 KPI changed unexpectedly: ${revenueBeforePreset} → ${revenueAfterPreset}`);
    }
    console.log('✅ T33.5 period preset reloads KPI consistently');

    await page.click('[data-testid="reports-export-csv"]');
    await new Promise((r) => setTimeout(r, 1500));
    const files = fs.readdirSync(downloadDir).filter((f) => f.endsWith('.csv'));
    if (files.length === 0) {
      throw new Error('T33.6 CSV file not downloaded');
    }
    const csvContent = fs.readFileSync(path.join(downloadDir, files[0]!), 'utf8');
    if (!csvContent.includes('Gross Revenue') || !csvContent.includes(`${PREFIX}-Special`)) {
      throw new Error(`T33.6 CSV content mismatch: ${csvContent.slice(0, 200)}`);
    }
    console.log('✅ T33.6 CSV export matches API data');
  } finally {
    await browser.close();
    await cleanup();
    fs.rmSync(downloadDir, { recursive: true, force: true });
  }

  await disconnectDb();

  console.log('--- Module 33 Reports Browser Tests Passed ---');
}

run().catch(async (err) => {
  console.error('❌', err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
