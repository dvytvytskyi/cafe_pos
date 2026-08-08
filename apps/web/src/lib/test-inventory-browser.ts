/**
 * Module 34 — Inventory browser test (T34.6 transfer 50 coffee → In Transit, stock reduced)
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { gotoPage, launchTestBrowser, BASE } from './browser-test-utils.ts';
import { invalidateInventoryCache } from './inventory-cache.ts';

const PREFIX = 'M34-Browser';
const COFFEE_SKU = 'INV-CFB-0001';
const COFFEE_NAME = `${PREFIX} Coffee Beans 1kg`;
const INITIAL_STOCK = 100;
const TRANSFER_QTY = 50;

async function cleanup() {
  await prisma.stockTransfer.deleteMany({ where: { item: { sku: COFFEE_SKU } } });
  await prisma.inventoryTransfer.deleteMany({ where: { item: { sku: COFFEE_SKU } } });
  await prisma.merchInventory.deleteMany({ where: { sku: COFFEE_SKU } });
  await invalidateInventoryCache();
}

async function run() {
  console.log('--- Module 34 Inventory Browser Tests ---');
  await cleanup();

  const createRes = await fetch(`${BASE}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: COFFEE_NAME,
      sku: COFFEE_SKU,
      price: 12,
      initialStock: INITIAL_STOCK,
      minStockLevel: 20,
    }),
  });
  const item = await createRes.json();
  if (createRes.status !== 201) {
    throw new Error(`Failed to seed inventory item: ${createRes.status} ${JSON.stringify(item)}`);
  }

  const browser = await launchTestBrowser();
  const page = await browser.newPage();

  try {
    await gotoPage(page, '/inventory');
    await page.waitForSelector('[data-testid="inventory-dashboard"]', { timeout: 30000 });

    await page.waitForFunction(
      (sku, qty) => {
        const row = document.querySelector(`[data-testid="inventory-row-${sku}"]`);
        return row && row.textContent?.includes(String(qty));
      },
      { timeout: 30000 },
      COFFEE_SKU,
      INITIAL_STOCK
    );
    console.log('✅ seeded coffee item visible in stock table');

    await page.click('[data-testid="inventory-tab-logistics"]');
    await page.waitForSelector('[data-testid="inventory-transfers-table"]', { timeout: 10000 });
    await page.click('[data-testid="new-transfer-open-btn"]');
    await page.waitForSelector('[data-testid="new-transfer-modal"]', { timeout: 10000 });

    await page.waitForFunction(
      (id) => {
        const select = document.querySelector('[data-testid="transfer-item-select"]') as HTMLSelectElement | null;
        return select && Array.from(select.options).some((o) => o.value === id);
      },
      { timeout: 30000 },
      item.id
    );

    await page.select('[data-testid="transfer-item-select"]', item.id);
    await page.click('[data-testid="transfer-quantity-input"]', { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await page.type('[data-testid="transfer-quantity-input"]', String(TRANSFER_QTY));

    const [transferRes] = await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/inventory/transfers') && res.request().method() === 'POST',
        { timeout: 15000 }
      ),
      page.click('[data-testid="transfer-create-btn"]'),
    ]);
    if (transferRes.status() !== 201) {
      const body = await transferRes.json().catch(() => ({}));
      throw new Error(`Transfer POST failed: ${transferRes.status()} ${JSON.stringify(body)}`);
    }
    const transferBody = await transferRes.json();
    if (transferBody.quantity !== TRANSFER_QTY) {
      throw new Error(`Expected transfer qty ${TRANSFER_QTY}, got ${transferBody.quantity}`);
    }

    await page.waitForFunction(
      () => !document.querySelector('[data-testid="new-transfer-modal"]'),
      { timeout: 15000 }
    );
    console.log('✅ transfer created via modal');

    await page.click('[data-testid="inventory-tab-stock"]');
    await page.waitForSelector('[data-testid="inventory-stock-table"]', { timeout: 10000 });

    const expectedStock = INITIAL_STOCK - TRANSFER_QTY;
    await page.waitForFunction(
      (args) => {
        const row = document.querySelector(`[data-testid="inventory-row-${args.sku}"]`);
        return row && row.textContent?.includes(String(args.qty));
      },
      { timeout: 30000 },
      { sku: COFFEE_SKU, qty: expectedStock }
    );
    console.log(`✅ T34.6 transfer ${TRANSFER_QTY} coffee → stock reduced to ${expectedStock}`);

    await page.click('[data-testid="inventory-tab-logistics"]');
    await page.waitForFunction(
      (sku) => !!document.querySelector(`[data-testid="transfer-row-${sku}"]`),
      { timeout: 15000 },
      COFFEE_SKU
    );
    console.log('✅ transfer row visible in logistics tab');

    console.log('--- Module 34 Inventory Browser Tests Passed ---');
  } finally {
    await browser.close();
    await cleanup();
    await disconnectDb();
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
