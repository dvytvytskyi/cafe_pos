/**
 * Module 25 — POS settings browser test (T25.4 EUR → USD in POS cart)
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { prisma } from './db.ts';
import { menuRepository } from '../repositories/menu.repository.ts';
import { invalidateMenuCache } from './menu-cache.ts';
import { DEFAULT_LOCATION_ID } from './constants.ts';
import { gotoPage, launchTestBrowser, openPosTable, reloadPage } from './browser-test-utils.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M25-Browser';
const TABLE_ID = 't1';

async function setupTableLayout() {
  await fetch(`${BASE}/api/locations/${DEFAULT_LOCATION_ID}/layout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rooms: [
        {
          id: 'room-1',
          name: 'Main Hall',
          tables: [
            {
              id: TABLE_ID,
              x: 1400,
              y: 1450,
              width: 60,
              height: 60,
              type: 'rect',
              name: '1',
              seats: 4,
              status: 'available',
            },
          ],
          zones: [],
          obstacles: [],
        },
      ],
    }),
  });
}

async function cleanup() {
  await invalidateMenuCache();
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.menuCategory.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

async function resetCurrency(currency: string) {
  await fetch(`${BASE}/api/settings/pos`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currency }),
  });
}

async function openPosAndAddItem(page: Page, itemName: string) {
  await openPosTable(page, TABLE_ID);

  await page.evaluate((name) => {
    const btn = Array.from(document.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(name)
    );
    btn?.click();
  }, itemName);

  await page.waitForSelector('[data-testid="pos-order-total"]', { timeout: 15000 });
}

async function main() {
  console.log('--- Module 25 POS Settings Browser Tests ---');
  await cleanup();
  await setupTableLayout();
  await resetCurrency('EUR');

  const cat = await menuRepository.createCategory(`${PREFIX}-Drinks`);
  await menuRepository.createMenuItem({
    name: `${PREFIX}-Latte`,
    price: 4.5,
    categoryId: cat.id,
  });
  await invalidateMenuCache();
  await fetch(`${BASE}/api/menu/categories`).catch(() => {});

  const browser = await launchTestBrowser();

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await openPosAndAddItem(page, `${PREFIX}-Latte`);
    let total = await page.$eval('[data-testid="pos-order-total"]', (el) => el.textContent?.trim() ?? '');
    if (!total.includes('€')) {
      throw new Error(`Expected € in POS total, got: ${total}`);
    }
    console.log('✅ POS cart shows EUR symbol');

    await gotoPage(page, '/settings');
    await page.evaluate(() => localStorage.setItem('corgi_active_menu', 'general'));
    await reloadPage(page, '[data-testid="pos-settings-currency"]');

    await page.select('[data-testid="pos-settings-currency"]', 'USD');
    await page.waitForSelector('[data-testid="pos-settings-save-bar"][data-visible="true"]', { timeout: 10000 });

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/settings/pos') && res.request().method() === 'PUT' && res.status() === 200,
        { timeout: 30000 }
      ),
      page.click('[data-testid="pos-settings-save-btn"]'),
    ]);

    await openPosAndAddItem(page, `${PREFIX}-Latte`);
    total = await page.$eval('[data-testid="pos-order-total"]', (el) => el.textContent?.trim() ?? '');
    if (!total.includes('$')) {
      throw new Error(`Expected $ in POS total after USD switch, got: ${total}`);
    }
    console.log('✅ T25.4 EUR → USD in POS cart after settings save');
  } finally {
    await browser.close();
    await resetCurrency('EUR');
    await cleanup();
  }

  console.log('--- Module 25 POS Settings Browser Tests Passed ---');
}

main().catch(async (err) => {
  console.error('❌ POS settings browser test failed:', err);
  await resetCurrency('EUR').catch(() => {});
  await cleanup().catch(() => {});
  process.exit(1);
});
