/**
 * Modules 16–17 — Full staff browser test suite
 * Covers all manual scenarios: T16.3, T16.6–T16.7, T16.9 + T17.6–T17.12
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { createHash } from 'crypto';
import { prisma, disconnectDb } from './db.ts';
import { EMPTY_STAFF_LIST_MESSAGE } from './staff-validation.ts';
import { gotoPage, launchTestBrowser, setReactInput } from './browser-test-utils.ts';

const PREFIX = 'M16-Browser';
const ROLE_ID = 'role-m16-browser-test';
const NEW_EMPLOYEE_NAME = `${PREFIX} Created New`;
const NEW_EMPLOYEE_PIN = '4567';
const EDITED_NAME = `${PREFIX} Edited Name`;
const DUP_PIN = '1234';

async function waitForStaffNames(page: Page, predicate: (names: string[]) => boolean, timeout = 30000) {
  await page.waitForFunction(
    (fnBody) => {
      const names = Array.from(document.querySelectorAll('[data-testid="staff-row-name"]')).map(
        (el) => el.textContent?.trim() ?? ''
      );
      return new Function('names', fnBody)(names);
    },
    { timeout },
    `return (${predicate.toString()})(names);`
  );
}

async function getStaffNames(page: Page) {
  return page.$$eval('[data-testid="staff-row-name"]', (els) =>
    els.map((el) => el.textContent?.trim() ?? '')
  );
}

async function cleanup() {
  await prisma.user.deleteMany({
    where: {
      OR: [
        { name: { startsWith: PREFIX } },
        { roleId: ROLE_ID },
      ],
    },
  });
  await prisma.role.deleteMany({ where: { id: ROLE_ID } });
}

async function setup() {
  await cleanup();
  const role = await prisma.role.upsert({
    where: { id: ROLE_ID },
    update: {},
    create: {
      id: ROLE_ID,
      name: `${PREFIX}-Role`,
      permissions: { orders: ['view'] },
    },
  });

  const mkUser = (name: string, pin: string, section: string, status: string) =>
    prisma.user.create({
      data: {
        name,
        pinHash: createHash('sha256').update(pin).digest('hex'),
        roleId: role.id,
        position: section === 'Kitchen' ? 'Chef' : 'Waiter',
        section,
        status,
        avatarInitials: name
          .split(' ')
          .map((p) => p[0])
          .join('')
          .slice(0, 2)
          .toUpperCase(),
      },
    });

  await mkUser(`${PREFIX} Active Floor`, '7890', 'Floor', 'active');
  await mkUser(`${PREFIX} Active Kitchen`, '7891', 'Kitchen', 'active');
  await mkUser(`${PREFIX} Archived Two`, '2222', 'Kitchen', 'inactive');
}

async function loadStaffPage(page: Page) {
  await gotoPage(page, '/staff', '[data-testid="staff-search-input"]');
  await page.waitForFunction(
    (prefix) =>
      Array.from(document.querySelectorAll('[data-testid="staff-row-name"]')).some((el) =>
        el.textContent?.includes(prefix)
      ),
    { timeout: 45000 },
    PREFIX
  );
}

async function run() {
  console.log('--- Modules 16–17 Staff Full Browser Tests ---');
  let browser: puppeteer.Browser | null = null;
  let exitCode = 0;
  const results: { id: string; pass: boolean; detail?: string }[] = [];

  const record = (id: string, pass: boolean, detail?: string) => {
    results.push({ id, pass, detail });
    console.log(`${pass ? '✅' : '❌'} ${id}${detail ? `: ${detail}` : ''}`);
    if (!pass) exitCode = 1;
  };

  try {
    await setup();

    browser = await launchTestBrowser();
    const page = await browser.newPage();
    await loadStaffPage(page);

    // T16.6 — search by name
    await setReactInput(page, '[data-testid="staff-search-input"]', 'Active Floor');
    await new Promise((r) => setTimeout(r, 300));
    await waitForStaffNames(
      page,
      (names) => names.some((n) => n.includes('Active Floor')) && !names.some((n) => n.includes('Active Kitchen'))
    );
    let names = await getStaffNames(page);
    record(
      'T16.6 search by name',
      names.some((n) => n.includes('Active Floor')) && !names.some((n) => n.includes('Active Kitchen')),
      names.join(', ')
    );

    await setReactInput(page, '[data-testid="staff-search-input"]', '');
    await page.waitForSelector('[data-testid="staff-table"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 300));

    // T16.9 — section tab Kitchen (before empty-state test)
    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-testid="staff-tab-Kitchen"]')?.click();
    });
    await new Promise((r) => setTimeout(r, 400));
    names = await getStaffNames(page);
    record(
      'T16.9 Kitchen section tab',
      names.some((n) => n.includes('Active Kitchen')) && !names.some((n) => n.includes('Active Floor')),
      names.join(', ')
    );

    await page.evaluate(() => {
      document.querySelector<HTMLElement>('[data-testid="staff-tab-All"]')?.click();
    });
    await page.waitForSelector('[data-testid="staff-table"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 300));

    // T16.7 — archived toggle
    await page.click('[data-testid="staff-archived-toggle"]');
    await new Promise((r) => setTimeout(r, 400));
    names = await getStaffNames(page);
    record(
      'T16.7 archived toggle',
      names.some((n) => n.includes('Archived Two')) &&
        !names.some((n) => n.includes('Active Floor') || n.includes('Active Kitchen')),
      names.join(', ')
    );

    await page.click('[data-testid="staff-archived-toggle"]');
    await page.waitForSelector('[data-testid="staff-table"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 300));

    // T16.3 — empty list placeholder (run after other filters)
    await setReactInput(page, '[data-testid="staff-search-input"]', `${PREFIX}-no-such-person-xyz`);
    await page.waitForSelector('[data-testid="staff-empty-state"]', { timeout: 10000 });
    const emptyText = await page.$eval('[data-testid="staff-empty-state"]', (el) => el.textContent?.trim() ?? '');
    record(
      'T16.3 empty list placeholder',
      emptyText === EMPTY_STAFF_LIST_MESSAGE,
      emptyText
    );

    await setReactInput(page, '[data-testid="staff-search-input"]', '');
    await page.waitForSelector('[data-testid="staff-table"]', { timeout: 10000 });
    await new Promise((r) => setTimeout(r, 300));

    // T17.11 — role select populated from API
    await page.click('[data-testid="staff-new-employee-btn"]');
    await page.waitForSelector('[data-testid="employee-modal"]', { timeout: 15000 });
    const roleCount = await page.$$eval('[data-testid="employee-role-select"] option', (opts) => opts.length);
    record('T17.11 role select from API', roleCount > 0, `${roleCount} roles`);

    // T17.6 — empty fields validation
    await page.click('[data-testid="employee-save-btn"]');
    await new Promise((r) => setTimeout(r, 400));
    const nameError = await page.$('[data-testid="employee-name-error"]');
    const pinError = await page.$('[data-testid="employee-pin-error"]');
    record('T17.6 empty fields → red hints', nameError !== null && pinError !== null);

    // T17.10 — invalid PIN letters rejected
    await setReactInput(page, '[data-testid="employee-name-input"]', `${PREFIX} Bad Pin`);
    await setReactInput(page, '[data-testid="employee-pin-input"]', 'abcd');
    await page.click('[data-testid="employee-save-btn"]');
    await new Promise((r) => setTimeout(r, 400));
    const pinFormatError = await page.$('[data-testid="employee-pin-error"]');
    const pinErrorText = pinFormatError
      ? await page.$eval('[data-testid="employee-pin-error"]', (el) => el.textContent?.trim() ?? '')
      : '';
    record('T17.10 invalid PIN letters rejected', pinFormatError !== null, pinErrorText);

    // T17.8 — create new employee
    await setReactInput(page, '[data-testid="employee-name-input"]', NEW_EMPLOYEE_NAME);
    await setReactInput(page, '[data-testid="employee-pin-input"]', NEW_EMPLOYEE_PIN);
    await page.evaluate((roleId) => {
      const select = document.querySelector<HTMLSelectElement>('[data-testid="employee-role-select"]');
      if (select) select.value = roleId;
      select?.dispatchEvent(new Event('change', { bubbles: true }));
    }, ROLE_ID);
    await page.select('select[name="section"]', 'Floor');

    await Promise.all([
      page.waitForResponse((res) => res.url().includes('/api/staff') && res.request().method() === 'POST', {
        timeout: 20000,
      }),
      page.click('[data-testid="employee-save-btn"]'),
    ]);
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="employee-modal"]'),
      { timeout: 10000 }
    );
    await waitForStaffNames(page, (ns) => ns.some((n) => n.includes('Created New')));
    names = await getStaffNames(page);
    record('T17.8 create employee via modal', names.some((n) => n.includes('Created New')), names.join(', '));

    // T17.9 — edit employee name
    const editBtn = await page.$(`[data-testid^="staff-edit-"]`);
    const rowWithNew = await page.evaluate((targetName) => {
      const rows = Array.from(document.querySelectorAll('[data-testid^="staff-row-"]'));
      for (const row of rows) {
        if (row.textContent?.includes(targetName)) {
          const edit = row.querySelector('[data-testid^="staff-edit-"]') as HTMLElement | null;
          return edit?.getAttribute('data-testid') ?? null;
        }
      }
      return null;
    }, 'Created New');

    if (rowWithNew) {
      await page.click(`[data-testid="${rowWithNew}"]`);
    } else if (editBtn) {
      await editBtn.click();
    }
    await page.waitForSelector('[data-testid="employee-modal"]', { timeout: 15000 });
    await setReactInput(page, '[data-testid="employee-name-input"]', EDITED_NAME);

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/staff/') && res.request().method() === 'PUT',
        { timeout: 20000 }
      ),
      page.click('[data-testid="employee-save-btn"]'),
    ]);
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="employee-modal"]'),
      { timeout: 10000 }
    );
    await new Promise((r) => setTimeout(r, 500));
    names = await getStaffNames(page);
    record(
      'T17.9 edit employee persists',
      names.some((n) => n.includes('Edited Name')),
      names.join(', ')
    );

    // T17.12 — archive via status select
    const editArchivedBtn = await page.evaluate((targetName) => {
      const rows = Array.from(document.querySelectorAll('[data-testid^="staff-row-"]'));
      for (const row of rows) {
        if (row.textContent?.includes(targetName)) {
          const edit = row.querySelector('[data-testid^="staff-edit-"]') as HTMLElement | null;
          return edit?.getAttribute('data-testid') ?? null;
        }
      }
      return null;
    }, 'Edited Name');

    if (editArchivedBtn) {
      await page.click(`[data-testid="${editArchivedBtn}"]`);
      await page.waitForSelector('[data-testid="employee-status-select"]', { timeout: 10000 });
      await page.select('[data-testid="employee-status-select"]', 'inactive');
      await Promise.all([
        page.waitForResponse(
          (res) => res.url().includes('/api/staff/') && res.request().method() === 'PUT',
          { timeout: 20000 }
        ),
        page.click('[data-testid="employee-save-btn"]'),
      ]);
      await page.waitForFunction(
        () => !document.querySelector('[data-testid="employee-modal"]'),
        { timeout: 10000 }
      );
    }

    await setReactInput(page, '[data-testid="staff-search-input"]', '');
    await page.click('[data-testid="staff-archived-toggle"]');
    await new Promise((r) => setTimeout(r, 500));
    names = await getStaffNames(page);
    record(
      'T17.12 archive via status select',
      names.some((n) => n.includes('Edited Name')),
      names.join(', ')
    );

    await page.click('[data-testid="staff-archived-toggle"]');
    await new Promise((r) => setTimeout(r, 300));

    // T17.7 — duplicate PIN toast
    await page.click('[data-testid="staff-new-employee-btn"]');
    await page.waitForSelector('[data-testid="employee-modal"]', { timeout: 15000 });
    await setReactInput(page, '[data-testid="employee-name-input"]', `${PREFIX} Dup Test`);
    await setReactInput(page, '[data-testid="employee-pin-input"]', DUP_PIN);
    await page.click('[data-testid="employee-save-btn"]');
    await page.waitForSelector('[data-testid="staff-toast"]', { timeout: 15000 });
    const toastText = await page.$eval('[data-testid="staff-toast"]', (el) => el.textContent?.trim() ?? '');
    record('T17.7 duplicate PIN toast', toastText.toLowerCase().includes('pin'), toastText);

    const passed = results.filter((r) => r.pass).length;
    console.log(`\n--- Summary: ${passed}/${results.length} passed ---`);
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
