/**
 * Module 23 — CRM QR browser test (T23.4 scan QR on POS)
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { prisma } from './db.ts';
import { buildCustomerQrCode } from './crm-validation.ts';
import { DEFAULT_LOCATION_ID } from './constants.ts';
import { BASE, gotoPage, launchTestBrowser, openPosTable, setReactInput } from './browser-test-utils.ts';

const PREFIX = 'M23-QR-Browser';
const TABLE_ID = 't1';

async function fillInput(page: Page, selector: string, value: string) {
  await setReactInput(page, selector, value);
}

async function cleanup() {
  await prisma.customer.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

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

async function main() {
  console.log('--- Module 23 CRM QR Browser Tests ---');
  await cleanup();
  await setupTableLayout();

  const customer = await prisma.customer.create({
    data: {
      name: `${PREFIX} QR Guest`,
      phone: '+380996666666',
      email: 'qr-browser@test.com',
      tier: 'Gold',
      points: 33,
      ltv: 100,
      visitCount: 3,
      joinedDate: '2026-01-01',
    },
  });
  const qrToken = buildCustomerQrCode(customer.id);

  await fetch(`${BASE}/api/crm/customers`);
  await fetch(`${BASE}/crm`);

  const browser = await launchTestBrowser();

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    // CRM: open loyalty QR pass and read token
    await gotoPage(page, '/crm', '[data-testid="crm-search-input"]');
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="crm-loading"]'),
      { timeout: 30000 }
    );

    await fillInput(page, '[data-testid="crm-search-input"]', 'QR Guest');
    await page.waitForFunction(
      () => {
        const names = Array.from(document.querySelectorAll('[data-testid="crm-guest-row-name"]')).map(
          (el) => el.textContent?.trim() ?? ''
        );
        return names.some((n) => n.includes('QR Guest'));
      },
      { timeout: 15000 }
    );

    await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll('[data-testid="crm-guest-row-name"]')).find((el) =>
        el.textContent?.includes('QR Guest')
      );
      row?.closest('div[class*="cursor-pointer"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    await page.waitForSelector('[data-testid="crm-qr-open"]', { timeout: 10000 });
    await page.click('[data-testid="crm-qr-open"]');
    await page.waitForSelector('[data-testid="crm-qr-token"]', { timeout: 10000 });

    const tokenFromUi = await page.$eval('[data-testid="crm-qr-token"]', (el) => el.textContent?.trim() ?? '');
    if (tokenFromUi !== qrToken) {
      throw new Error(`CRM QR token mismatch: UI=${tokenFromUi} expected=${qrToken}`);
    }
    console.log('✅ CRM loyalty pass shows crm_client token');

    // POS: paste QR token → customer linked
    await openPosTable(page, TABLE_ID);
    await page.waitForSelector('[data-testid="pos-guest-search-input"]', { timeout: 15000 });

    await fillInput(page, '[data-testid="pos-guest-search-input"]', qrToken);

    await page.waitForSelector('[data-testid="pos-linked-guest-name"]', { timeout: 15000 });
    const linkedName = await page.$eval(
      '[data-testid="pos-linked-guest-name"]',
      (el) => el.textContent?.trim() ?? ''
    );
    if (!linkedName.includes('QR Guest')) {
      throw new Error(`Expected linked guest name, got: ${linkedName}`);
    }
    console.log('✅ T23.4 scan QR on POS → customer card opens');
  } finally {
    await browser.close();
    await cleanup();
  }

  console.log('--- Module 23 CRM QR Browser Tests Passed ---');
}

main().catch(async (err) => {
  console.error('❌ CRM QR browser test failed:', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
