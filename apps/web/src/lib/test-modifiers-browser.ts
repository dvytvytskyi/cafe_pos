/**
 * Module 15 — POS modifier browser test (T15.5)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { menuRepository } from '../repositories/menu.repository.ts';
import { modifierRepository } from '../repositories/modifier.repository.ts';
import { invalidateMenuCache } from './menu-cache.ts';
import { DEFAULT_LOCATION_ID } from './constants.ts';
import { launchTestBrowser, openPosTable } from './browser-test-utils.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M15-Browser';

async function cleanup() {
  await invalidateMenuCache();
  await prisma.modifierOption.deleteMany({
    where: { group: { name: { startsWith: PREFIX } } },
  });
  await prisma.modifierGroup.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.menuCategory.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

async function setup() {
  await cleanup();
  await fetch(`${BASE}/api/locations/${DEFAULT_LOCATION_ID}/layout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rooms: [
        {
          id: 'room-1',
          name: 'Main Hall',
          tables: [
            { id: 't1', x: 1400, y: 1450, width: 60, height: 60, type: 'rect', name: '1', seats: 4, status: 'available' },
          ],
          zones: [],
          obstacles: [],
        },
      ],
    }),
  });
  const cat = await menuRepository.createCategory(`${PREFIX}-Coffee`);
  const coffee = await menuRepository.createMenuItem({
    name: `${PREFIX}-Coffee`,
    price: 3.5,
    categoryId: cat.id,
  });
  const group = await modifierRepository.createGroup({
    name: `${PREFIX}-Milk`,
    minQty: 0,
    maxQty: 1,
    options: [{ name: 'Oat Milk', price: 0.8 }],
    categoryIds: [cat.id],
  });
  const oatOption = group.options[0]!;
  await invalidateMenuCache();
  await fetch(`${BASE}/api/menu/categories`).catch(() => {});
  return { catId: cat.id, catName: cat.name, coffeeId: coffee.id, oatOptionId: oatOption.id };
}

async function run() {
  console.log('--- Module 15 Modifiers Browser Tests ---');
  let browser: puppeteer.Browser | null = null;
  let exitCode = 0;
  let coffeeId = '';
  let oatOptionId = '';
  let catId = '';

  try {
    ({ coffeeId, oatOptionId, catId } = await setup());

    browser = await launchTestBrowser();
    const page = await browser.newPage();

    await openPosTable(page, 't1');
    await page.waitForSelector(`[data-testid="pos-category-${catId}"]`, { timeout: 30000 });
    await page.click(`[data-testid="pos-category-${catId}"]`);

    await page.waitForSelector(`[data-testid="pos-menu-item-${coffeeId}"]`, { timeout: 45000 });

    await page.click(`[data-testid="pos-menu-item-${coffeeId}"]`);
    await page.waitForSelector('[data-testid="pos-modifier-picker"]', { timeout: 15000 });
    await page.click(`[data-testid="pos-modifier-option-${oatOptionId}"]`);
    await page.click('[data-testid="pos-modifier-confirm-btn"]');
    await page.waitForFunction(
      (expected) => document.querySelector('[data-testid="pos-order-total"]')?.textContent?.includes(expected) ?? false,
      { timeout: 10000 },
      '4.3'
    );

    const totalText = await page.$eval('[data-testid="pos-order-total"]', (el) => el.textContent?.trim() ?? '');
    const pass = totalText.includes('4.30') || totalText.includes('4.3');
    console.log(`${pass ? '✅' : '❌'} T15.5: total=${totalText} expected ~€4.30 (3.50 + 0.80)`);
    if (!pass) exitCode = 1;
  } catch (err) {
    exitCode = 1;
    console.error(err);
  } finally {
    if (browser) await browser.close();
    await cleanup();
    await disconnectDb();
    process.exit(exitCode);
  }
}

run();
