/**
 * Module 13 — MenusView browser manual tests
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { menuRepository } from '../repositories/menu.repository.ts';
import { invalidateMenuCache } from './menu-cache.ts';
import { gotoPage, launchTestBrowser, reloadPage, setReactInput } from './browser-test-utils.ts';

const PREFIX = 'M13-Browser';

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

  const names: string[] = [];
  const ids: string[] = [];
  for (let i = 0; i < 3; i++) {
    const name = `${PREFIX}-Cat-${i}`;
    const cat = await menuRepository.createCategory(name);
    names.push(name);
    ids.push(cat.id);
  }

  const dish = await menuRepository.createMenuItem({
    name: `${PREFIX}-Latte`,
    description: 'Test coffee drink',
    price: 3.5,
    categoryId: ids[0],
  });

  return { catIds: ids, catNames: names, dishId: dish.id };
}

async function cleanupDb(catIds: string[], dishId: string) {
  await prisma.menuItem.deleteMany({ where: { id: dishId } });
  await prisma.menuCategory.deleteMany({ where: { id: { in: catIds } } });
  await invalidateMenuCache();
}

async function openMenuPage(page: puppeteer.Page, firstCatId: string) {
  await gotoPage(page, '/menu', `[data-testid="menu-category-${firstCatId}"]`);
  await page.click(`[data-testid="menu-category-${firstCatId}"]`);
  await page.waitForSelector('[data-testid="menu-dish-grid"], [data-testid^="dish-card-"]', { timeout: 15000 }).catch(() => {});
}

async function run() {
  console.log('--- Module 13 MenusView Browser Tests ---');
  let browser: puppeteer.Browser | null = null;
  let exitCode = 0;
  let catIds: string[] = [];
  let catNames: string[] = [];
  let dishId = '';

  try {
    ({ catIds, catNames, dishId } = await setupDb());

    browser = await launchTestBrowser();
    const page = await browser.newPage();

    await openMenuPage(page, catIds[0]);

    // T13.7 — reorder persists after refresh
    const reversedIds = [...catIds].reverse();
    const reversedNames = [...catNames].reverse();
    await page.evaluate(async (orderedIds) => {
      await fetch('/api/menu/categories/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds }),
      });
    }, reversedIds);

    await reloadPage(page, `[data-testid="menu-category-${catIds[0]}"]`);

    const orderAfterReload = await page.evaluate((names) => {
      return [...document.querySelectorAll('[data-testid^="menu-category-"]')]
        .map((el) => {
          const label = el.querySelector('span.text-\\[14px\\]')?.textContent?.trim() ?? '';
          return label;
        })
        .filter((name) => names.includes(name));
    }, catNames);

    record(
      'T13.7',
      JSON.stringify(orderAfterReload) === JSON.stringify(reversedNames),
      `order=${orderAfterReload.join('>')}`
    );

    await page.click(`[data-testid="menu-category-${catIds[0]}"]`);
    await page.waitForSelector(`[data-testid="dish-card-${dishId}"], [data-testid="dish-visibility-${dishId}"]`, {
      timeout: 15000,
    }).catch(() => {});

    // T13.3b — search filters dish
    await setReactInput(page, 'input[placeholder="Search dishes..."]', 'latte');
    const visibleDish = await page
      .waitForFunction(
        (name) => [...document.querySelectorAll('h3')].some((h) => h.textContent?.includes(name)),
        { timeout: 10000 },
        `${PREFIX}-Latte`
      )
      .then(() => true)
      .catch(() => false);
    record('T13.3b', visibleDish, `search hit=${visibleDish}`);

    await setReactInput(page, 'input[placeholder="Search dishes..."]', '');

    // T13.8 — archive dish then show in archived view
    await page.waitForSelector(`[data-testid="dish-visibility-${dishId}"]`, { timeout: 15000 });
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes(`/api/menu/items/${dishId}`) && res.request().method() === 'DELETE',
        { timeout: 15000 }
      ),
      page.evaluate((id) => {
        document.querySelector<HTMLButtonElement>(`[data-testid="dish-visibility-${id}"]`)?.click();
      }, dishId),
    ]);
    await page.click('[data-testid="menu-archived-toggle"]');
    const archivedVisible = await page
      .waitForFunction(
        (name) => [...document.querySelectorAll('h3')].some((h) => h.textContent?.includes(name)),
        { timeout: 10000 },
        `${PREFIX}-Latte`
      )
      .then(() => true)
      .catch(() => false);
    const dbArchived = await prisma.menuItem.findUnique({ where: { id: dishId } });
    record(
      'T13.8',
      archivedVisible && dbArchived?.isArchived === true,
      `UI=${archivedVisible} DB archived=${dbArchived?.isArchived}`
    );

    const failed = results.filter((r) => !r.pass);
    console.log(`\nPassed: ${results.length - failed.length}/${results.length}`);
    if (failed.length > 0) exitCode = 1;
    else console.log('✅ Module 13 browser tests passed.');
  } catch (err) {
    console.error(err);
    exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    if (catIds.length) await cleanupDb(catIds, dishId).catch(() => {});
    await disconnectDb();
    process.exit(exitCode);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
