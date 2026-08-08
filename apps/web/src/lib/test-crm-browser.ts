/**
 * Modules 20–22 — CRM browser tests
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { prisma } from './db.ts';
import { BASE, gotoPage, launchTestBrowser, setReactInput } from './browser-test-utils.ts';

const PREFIX = 'M20-Browser';

async function fillFormField(page: Page, selector: string, value: string) {
  await page.waitForSelector(selector);
  await page.$eval(selector, (el, val) => {
    const input = el as HTMLInputElement | HTMLTextAreaElement;
    input.focus();
    const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    setter?.call(input, val);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

async function waitForGuestNames(page: Page, prefix: string, timeout = 90000) {
  await page.waitForFunction(
    (expectedPrefix) => {
      const names = Array.from(document.querySelectorAll('[data-testid="crm-guest-row-name"]')).map(
        (el) => el.textContent?.trim() ?? ''
      );
      return (
        names.some((n) => n.includes(`${expectedPrefix} Searchable Alpha`)) &&
        names.some((n) => n.includes(`${expectedPrefix} Searchable Beta`))
      );
    },
    { timeout },
    prefix
  );
}

async function getGuestNames(page: Page) {
  return page.$$eval('[data-testid="crm-guest-row-name"]', (els) =>
    els.map((el) => el.textContent?.trim() ?? '')
  );
}

async function cleanup() {
  await prisma.loyaltyTransaction.deleteMany({
    where: { customer: { name: { startsWith: PREFIX } } },
  });
  await prisma.customer.deleteMany({
    where: { name: { startsWith: PREFIX } },
  });
}

async function setup() {
  await cleanup();
  await prisma.customer.createMany({
    data: [
      {
        name: `${PREFIX} Searchable Alpha`,
        phone: '+380991111111',
        email: 'alpha@test.com',
        tier: 'Bronze',
        points: 5,
        ltv: 0,
        visitCount: 0,
        joinedDate: '2026-01-01',
      },
      {
        name: `${PREFIX} Searchable Beta`,
        phone: '+380992222222',
        email: 'beta@test.com',
        tier: 'Gold',
        points: 20,
        ltv: 100,
        visitCount: 5,
        joinedDate: '2026-01-01',
        lastVisitDate: '2026-07-01',
      },
      {
        name: `${PREFIX} Low Balance`,
        phone: '+380994444444',
        email: 'lowbalance@test.com',
        tier: 'Bronze',
        points: 20,
        ltv: 0,
        visitCount: 0,
        joinedDate: '2026-01-01',
      },
    ],
  });
}

async function warmup() {
  await fetch(`${BASE}/api/crm/customers`);
  await fetch(`${BASE}/crm`);
}

async function main() {
  console.log('--- Modules 20–22 CRM Browser Tests ---');

  await setup();
  await warmup();

  const browser = await launchTestBrowser();

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await gotoPage(page, '/crm', '[data-testid="crm-search-input"]');
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="crm-loading"]'),
      { timeout: 30000 }
    );

    const loadError = await page.$('[data-testid="crm-load-error"]');
    if (loadError) {
      const msg = await page.$eval('[data-testid="crm-load-error"]', (el) => el.textContent);
      throw new Error(`CRM page load error: ${msg}`);
    }

    await waitForGuestNames(page, PREFIX);
    console.log('✅ CRM page loads guests from API');

    // T20.6 — search by name
    await setReactInput(page, '[data-testid="crm-search-input"]', 'Searchable Alpha');
    await page.waitForFunction(
      () => {
        const names = Array.from(document.querySelectorAll('[data-testid="crm-guest-row-name"]')).map(
          (el) => el.textContent?.trim() ?? ''
        );
        return names.length === 1 && names[0]!.includes('Alpha');
      },
      { timeout: 15000 }
    );
    console.log('✅ T20.6 search filters table by name');

    // T20.6 — search by phone suffix
    await setReactInput(page, '[data-testid="crm-search-input"]', '992222222');
    await page.waitForFunction(
      () => {
        const names = Array.from(document.querySelectorAll('[data-testid="crm-guest-row-name"]')).map(
          (el) => el.textContent?.trim() ?? ''
        );
        return names.length === 1 && names[0]!.includes('Beta');
      },
      { timeout: 15000 }
    );
    console.log('✅ T20.6 search filters table by phone');

    await setReactInput(page, '[data-testid="crm-search-input"]', 'nonexistent-xyz');
    await page.waitForSelector('[data-testid="crm-empty-state"]', { timeout: 5000 });
    const emptyText = await page.$eval('[data-testid="crm-empty-state"]', (el) => el.textContent?.trim());
    if (!emptyText?.includes('No guests match')) {
      throw new Error(`Expected empty state message, got: ${emptyText}`);
    }
    console.log('✅ T20.6 empty state when no matches');

    // Create guest via UI → appears in list + DB
    await setReactInput(page, '[data-testid="crm-search-input"]', '');
    await page.click('[data-testid="crm-add-guest-btn"]');
    await page.waitForSelector('[data-testid="crm-form-name"]');
    await setReactInput(page, '[data-testid="crm-form-name"]', `${PREFIX} Created Via UI`);
    await setReactInput(page, '[data-testid="crm-form-phone"]', '+380993333333');
    await setReactInput(page, '[data-testid="crm-form-email"]', 'ui-created@test.com');
    await page.click('[data-testid="crm-form-submit"]');

    await page.waitForFunction(
      (expectedName) => {
        const names = Array.from(document.querySelectorAll('[data-testid="crm-guest-row-name"]')).map(
          (el) => el.textContent?.trim() ?? ''
        );
        return names.some((n) => n.includes(expectedName));
      },
      { timeout: 30000 },
      `${PREFIX} Created Via UI`
    );

    const dbGuest = await prisma.customer.findFirst({
      where: { name: `${PREFIX} Created Via UI` },
    });
    if (!dbGuest || dbGuest.phone !== '+380993333333') {
      throw new Error('Guest not persisted in PostgreSQL after UI create');
    }
    console.log('✅ CRM add guest via UI persists to PostgreSQL');

    await page.waitForFunction(() => !document.querySelector('[data-testid="crm-form-submit"]'), { timeout: 10000 });

    // T21 — validation UI hints
    await page.click('[data-testid="crm-add-guest-btn"]');
    await page.waitForSelector('[data-testid="crm-form-submit"]', { timeout: 10000 });
    await fillFormField(page, '[data-testid="crm-form-name"]', 'AB');
    await fillFormField(page, '[data-testid="crm-form-phone"]', '1234');
    await fillFormField(page, '[data-testid="crm-form-email"]', 'bad-email');
    await page.click('[data-testid="crm-form-submit"]');
    await page.waitForSelector('[data-testid="crm-form-phone-error"]', { timeout: 5000 });
    await page.waitForSelector('[data-testid="crm-form-email-error"]', { timeout: 5000 });
    console.log('✅ T21.1/T21.2 validation errors shown in modal');
    await page.evaluate(() => {
      const cancel = Array.from(document.querySelectorAll('form button[type="button"]')).find(
        (b) => b.textContent?.trim() === 'Cancel'
      ) as HTMLButtonElement | undefined;
      cancel?.click();
    });
    await page.waitForFunction(() => !document.querySelector('[data-testid="crm-form-submit"]'), { timeout: 5000 });

    // T21.4 — duplicate phone toast
    await page.click('[data-testid="crm-add-guest-btn"]');
    await page.waitForSelector('[data-testid="crm-form-submit"]', { timeout: 10000 });
    await setReactInput(page, '[data-testid="crm-form-name"]', `${PREFIX} Dup Phone`);
    await setReactInput(page, '[data-testid="crm-form-phone"]', '0994444444');
    await setReactInput(page, '[data-testid="crm-form-email"]', 'dup-phone@test.com');
    await page.click('[data-testid="crm-form-submit"]');
    await page.waitForSelector('[data-testid="crm-toast"]', { timeout: 10000 });
    const toastText = await page.$eval('[data-testid="crm-toast"]', (el) => el.textContent?.trim() ?? '');
    if (!toastText.toLowerCase().includes('phone')) {
      throw new Error(`Expected duplicate phone toast, got: ${toastText}`);
    }
    console.log('✅ T21.4 duplicate phone toast shown');
    await page.evaluate(() => {
      const cancel = Array.from(document.querySelectorAll('form button[type="button"]')).find(
        (b) => b.textContent?.trim() === 'Cancel'
      ) as HTMLButtonElement | undefined;
      cancel?.click();
    });
    await page.waitForFunction(() => !document.querySelector('[data-testid="crm-form-submit"]'), { timeout: 5000 });

    // T22.5 — subtract more points than balance
    await setReactInput(page, '[data-testid="crm-search-input"]', 'Low Balance');
    await page.waitForFunction(
      () => {
        const names = Array.from(document.querySelectorAll('[data-testid="crm-guest-row-name"]')).map(
          (el) => el.textContent?.trim() ?? ''
        );
        return names.some((n) => n.includes('Low Balance'));
      },
      { timeout: 15000 }
    );
    await page.evaluate(() => {
      const row = Array.from(document.querySelectorAll('[data-testid="crm-guest-row-name"]')).find((el) =>
        el.textContent?.includes('Low Balance')
      );
      row?.closest('div[class*="cursor-pointer"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    await page.waitForSelector('[data-testid="crm-adjust-open"]', { timeout: 10000 });
    await page.click('[data-testid="crm-adjust-open"]');
    await page.waitForSelector('[data-testid="crm-adjust-amount"]');
    await page.click('[data-testid="crm-adjust-subtract"]');
    await setReactInput(page, '[data-testid="crm-adjust-amount"]', '50');
    await fillFormField(page, '[data-testid="crm-adjust-reason"]', 'test overspend');
    await page.click('[data-testid="crm-adjust-submit"]');
    await page.waitForSelector('[data-testid="crm-adjust-error"]', { timeout: 10000 });
    const adjustErr = await page.$eval('[data-testid="crm-adjust-error"]', (el) => el.textContent?.trim() ?? '');
    if (!adjustErr.toLowerCase().includes('not enough')) {
      throw new Error(`Expected insufficient points error, got: ${adjustErr}`);
    }
    const lowBalDb = await prisma.customer.findFirst({ where: { name: `${PREFIX} Low Balance` } });
    if (!lowBalDb || lowBalDb.points !== 20) {
      throw new Error(`Balance should remain 20 after blocked subtract, got ${lowBalDb?.points}`);
    }
    console.log('✅ T22.5 spend 50 with balance 20 blocked in UI');

    const names = await getGuestNames(page);
    console.log(`   Visible guests after tests: ${names.length}`);
  } finally {
    await browser.close();
    await cleanup();
  }

  console.log('--- Modules 20–22 CRM Browser Tests Passed ---');
}

main().catch(async (err) => {
  console.error('❌ CRM browser test failed:', err);
  await cleanup().catch(() => {});
  process.exit(1);
});
