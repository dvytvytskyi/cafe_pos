/**
 * Module 14 — DishModal browser tests (T14.6–T14.7)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { menuRepository } from '../repositories/menu.repository.ts';
import { invalidateMenuCache } from './menu-cache.ts';
import { gotoPage, launchTestBrowser, reloadPage, setReactInput } from './browser-test-utils.ts';

const PREFIX = 'M14-Browser';

type Result = { id: string; pass: boolean; detail: string };
const results: Result[] = [];

function record(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${id}: ${detail}`);
}

async function setupDb() {
  await invalidateMenuCache();
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.menuCategory.deleteMany({ where: { name: { startsWith: PREFIX } } });

  const cat = await menuRepository.createCategory(`${PREFIX}-Cat`);
  const dish = await menuRepository.createMenuItem({
    name: `${PREFIX}-Cappuccino`,
    description: 'Browser test drink',
    price: 4.5,
    categoryId: cat.id,
    allergens: [],
  });

  return { catId: cat.id, dishId: dish.id };
}

async function cleanupDb(catId: string, dishId: string) {
  await prisma.menuItem.deleteMany({ where: { id: dishId } });
  await prisma.menuCategory.deleteMany({ where: { id: catId } });
  await invalidateMenuCache();
}

async function saveEditModal(page: puppeteer.Page, dishId: string) {
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-testid="dish-save-btn"]')?.click();
  });
  await page.waitForSelector('[data-testid="dish-save-confirm-btn"]', { timeout: 10000 });
  const [response] = await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes(`/api/menu/items/${dishId}`) && res.request().method() === 'PUT',
      { timeout: 25000 }
    ),
    page.evaluate(() => {
      document.querySelector<HTMLButtonElement>('[data-testid="dish-save-confirm-btn"]')?.click();
    }),
  ]);
  return response;
}

async function openMenuPage(page: puppeteer.Page, catId: string) {
  await gotoPage(page, '/menu', `[data-testid="menu-category-${catId}"]`);
  await page.click(`[data-testid="menu-category-${catId}"]`);
}

async function run() {
  console.log('--- Module 14 DishModal Browser Tests ---');
  let browser: puppeteer.Browser | null = null;
  let exitCode = 0;
  let catId = '';
  let dishId = '';

  try {
    ({ catId, dishId } = await setupDb());

    browser = await launchTestBrowser();
    const page = await browser.newPage();

    await openMenuPage(page, catId);
    await page.waitForSelector(`[data-testid="dish-card-${dishId}"]`, { timeout: 30000 });

    // T14.6 — change price → menu card shows new price + API reflects it
    await page.click(`[data-testid="dish-card-${dishId}"]`);
    await page.waitForSelector('[data-testid="dish-modal"]', { timeout: 15000 });
    await page.click('[data-testid="dish-section-price"]');
    await page.waitForSelector('[data-testid="dish-price-input"]', { timeout: 10000 });
    await setReactInput(page, '[data-testid="dish-price-input"]', '6.75');

    const inputVal = await page.$eval('[data-testid="dish-price-input"]', (el) => (el as HTMLInputElement).value);
    if (inputVal !== '6.75') {
      record('T14.6', false, `input not updated: ${inputVal}`);
    } else {
      await saveEditModal(page, dishId);
      await reloadPage(page, `[data-testid="menu-category-${catId}"]`);
      await openMenuPage(page, catId);
      await page.waitForSelector(`[data-testid="dish-card-${dishId}"]`, { timeout: 30000 });

      const cardPrice = await page.evaluate((id) => {
        const card = document.querySelector(`[data-testid="dish-card-${id}"]`);
        return card?.textContent?.includes('6.75') ?? false;
      }, dishId);

      const apiPrice = await page.evaluate(async (id) => {
        const res = await fetch('/api/menu/categories?includeArchived=true');
        const cats = await res.json();
        for (const cat of cats) {
          const item = cat.items.find((i: { id: string }) => i.id === id);
          if (item) return item.price;
        }
        return null;
      }, dishId);

      record('T14.6', cardPrice && apiPrice === 6.75, `card=${cardPrice} apiPrice=${apiPrice}`);
    }

    // T14.7 — add Gluten allergen → icon on card
    await page.click(`[data-testid="dish-card-${dishId}"]`);
    await page.waitForSelector('[data-testid="dish-modal"]', { timeout: 15000 });
    await page.click('[data-testid="dish-section-allergens"]');
    await page.waitForSelector('[data-testid="dish-allergen-gluten"]', { timeout: 10000 });
    await page.click('[data-testid="dish-allergen-gluten"]');
    await saveEditModal(page, dishId);
    await page.waitForFunction(
      (id) => {
        const el = document.querySelector(`[data-testid="dish-allergens-${id}"]`);
        return el?.textContent?.includes('🌾') ?? false;
      },
      { timeout: 15000 },
      dishId
    );

    const glutenIcon = await page.evaluate((id) => {
      const el = document.querySelector(`[data-testid="dish-allergens-${id}"]`);
      return el?.textContent?.includes('🌾') ?? false;
    }, dishId);

    record('T14.7', glutenIcon, `glutenIcon=${glutenIcon}`);
  } catch (err) {
    exitCode = 1;
    console.error(err);
  } finally {
    if (browser) await browser.close();
    if (catId && dishId) await cleanupDb(catId, dishId);
    await disconnectDb();

    const failed = results.filter((r) => !r.pass);
    if (failed.length > 0) exitCode = 1;
    console.log(`\nBrowser summary: ${results.length - failed.length}/${results.length} passed`);
    process.exit(exitCode);
  }
}

run();
