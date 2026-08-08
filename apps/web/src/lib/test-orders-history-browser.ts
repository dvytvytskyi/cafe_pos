/**
 * Module 32 — Order history browser tests (T32.6 delivery filter, T32.7 receipt search)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { gotoPage, launchTestBrowser } from './browser-test-utils.ts';

const LOC = 'default';
const PREFIX = 'M32-Browser';

async function cleanup() {
  await prisma.transaction.deleteMany({
    where: { order: { customerName: { startsWith: PREFIX } } },
  });
  await prisma.orderItem.deleteMany({
    where: { order: { customerName: { startsWith: PREFIX } } },
  });
  await prisma.order.deleteMany({
    where: { customerName: { startsWith: PREFIX } },
  });
}

async function run() {
  console.log('--- Module 32 Order History Browser Tests ---');
  await cleanup();

  await prisma.location.upsert({
    where: { id: LOC },
    create: { id: LOC, name: 'Default Location' },
    update: {},
  });

  const receiptNo = `${PREFIX}-RCPT-777`;
  await prisma.order.create({
    data: {
      id: `${PREFIX}-glovo`,
      orderNumber: `${PREFIX}-GLV-777`,
      source: 'glovo',
      customerName: `${PREFIX}-Delivery`,
      locationId: LOC,
      status: 'completed',
      total: 18,
      paid: true,
      amountPaid: 18,
      createdAt: new Date(),
      items: { create: [{ name: 'Wrap', price: 18, quantity: 1 }] },
    },
  });

  await prisma.order.create({
    data: {
      id: `${PREFIX}-dine`,
      orderNumber: receiptNo,
      source: 'dine_in',
      customerName: `${PREFIX}-Dine`,
      locationId: LOC,
      status: 'completed',
      total: 12,
      paid: true,
      amountPaid: 12,
      createdAt: new Date(),
      items: { create: [{ name: 'Latte', price: 12, quantity: 1 }] },
    },
  });

  const browser = await launchTestBrowser();
  const page = await browser.newPage();

  try {
    await gotoPage(page, '/history');
    await page.waitForSelector('[data-testid="history-page"]', { timeout: 30000 });

    await page.waitForSelector(`[data-testid="history-row-${PREFIX}-GLV-777"]`, { timeout: 15000 });
    await page.waitForSelector(`[data-testid="history-row-${receiptNo}"]`, { timeout: 15000 });
    console.log('✅ seeded orders visible');

    await page.click('[data-testid="history-source-glovo"]');
    await page.waitForFunction(
      (rcpt) => document.querySelector(`[data-testid="history-row-${rcpt}"]`) === null,
      { timeout: 15000 },
      receiptNo
    );
    await page.waitForSelector(`[data-testid="history-row-${PREFIX}-GLV-777"]`, { timeout: 10000 });
    console.log('✅ T32.6 glovo filter shows delivery only');

    await page.click('[data-testid="history-source-all"]');
    await page.waitForSelector(`[data-testid="history-row-${receiptNo}"]`, { timeout: 15000 });

    await page.click('[data-testid="history-search"]', { clickCount: 3 });
    await page.type('[data-testid="history-search"]', receiptNo);
    await page.waitForFunction(
      (rcpt) => {
        const rows = Array.from(document.querySelectorAll('[data-testid^="history-row-"]'));
        return rows.length === 1 && rows[0]?.getAttribute('data-testid') === `history-row-${rcpt}`;
      },
      { timeout: 15000 },
      receiptNo
    );
    console.log('✅ T32.7 search by receipt number');
  } finally {
    await browser.close();
    await cleanup();
    await disconnectDb();
  }

  console.log('--- Module 32 Order History Browser Tests Passed ---');
}

run().catch(async (err) => {
  console.error('❌', err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
