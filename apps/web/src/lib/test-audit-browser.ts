/**
 * Module 29 — Audit panel browser test (T29.5 menu archive → audit entry)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { menuRepository } from '../repositories/menu.repository.ts';
import { invalidateMenuCache } from './menu-cache.ts';
import { gotoPage, launchTestBrowser } from './browser-test-utils.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M29-Browser';

async function cleanup() {
  await invalidateMenuCache();
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.menuCategory.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

async function run() {
  console.log('--- Module 29 Audit Browser Tests ---');
  await cleanup();

  const cat = await menuRepository.createCategory(`${PREFIX}-Cat`);
  const item = await menuRepository.createMenuItem({
    name: `${PREFIX}-Soup`,
    price: 8.5,
    categoryId: cat.id,
    allergens: [],
  });

  const delRes = await fetch(`${BASE}/api/menu/items/${item.id}`, { method: 'DELETE' });
  if (delRes.status !== 200) {
    throw new Error(`Menu delete failed: ${delRes.status}`);
  }
  console.log('✅ T29.5 menu item archived via API');

  const auditRes = await fetch(`${BASE}/api/audit?action=menu_item_archived&limit=20`);
  const auditBody = await auditRes.json();
  const entry = auditBody.items?.find(
    (l: { details?: { name?: string; itemId?: string } }) =>
      l.details?.itemId === item.id || l.details?.name === `${PREFIX}-Soup`
  );
  if (!entry) {
    throw new Error('Audit entry for menu_item_archived not found');
  }
  console.log('✅ audit entry contains archived item name');

  const browser = await launchTestBrowser();
  const page = await browser.newPage();

  try {
    await gotoPage(page, '/settings');
    await page.evaluate(() => localStorage.setItem('corgi_active_menu', 'audit'));
    await page.reload({ waitUntil: 'load' });
    await page.waitForSelector('[data-testid="audit-panel"]', { timeout: 30000 });

    await page.select('[data-testid="audit-filter-action"]', 'menu_item_archived');
    await page.waitForFunction(
      () => document.querySelector('[data-testid="audit-action-menu_item_archived"]') !== null,
      { timeout: 15000 }
    );

    const detailsText = await page.evaluate(() => {
      const row = document.querySelector('[data-testid="audit-action-menu_item_archived"]')?.closest('tr');
      return row?.textContent ?? '';
    });

    if (!detailsText.includes(`${PREFIX}-Soup`)) {
      throw new Error(`Audit panel missing item name in row: ${detailsText}`);
    }
    console.log('✅ audit panel shows menu_item_archived entry');
  } finally {
    await browser.close();
    await cleanup();
    await disconnectDb();
  }

  console.log('--- Module 29 Audit Browser Tests Passed ---');
}

run().catch(async (err) => {
  console.error('❌', err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
