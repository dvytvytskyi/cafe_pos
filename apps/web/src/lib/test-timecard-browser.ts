/**
 * Module 18 — Full time tracking browser suite
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { createHash } from 'crypto';
import { prisma, disconnectDb } from './db.ts';
import { gotoPage, launchTestBrowser, reloadPage } from './browser-test-utils.ts';

const ROLE_ID = 'role-m18-browser';
const PREFIX = 'M18-Browser';
const USER_PENDING = 'user-m18-pending';
const USER_ONSHIFT = 'user-m18-onshift';
const USER_FINISHED = 'user-m18-finished';

async function cleanup() {
  const ids = [USER_PENDING, USER_ONSHIFT, USER_FINISHED];
  await prisma.timeCard.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.role.deleteMany({ where: { id: ROLE_ID } });
}

async function setup() {
  await cleanup();
  const role = await prisma.role.create({
    data: { id: ROLE_ID, name: `${PREFIX}-Role`, permissions: {} },
  });

  const mkUser = (id: string, name: string) =>
    prisma.user.create({
      data: {
        id,
        name: `${PREFIX} ${name}`,
        pinHash: createHash('sha256').update('5544').digest('hex'),
        roleId: role.id,
        position: 'Waiter',
        section: 'Floor',
        status: 'active',
        avatarInitials: name.slice(0, 2).toUpperCase(),
      },
    });

  await mkUser(USER_PENDING, 'Pending');
  await mkUser(USER_ONSHIFT, 'OnShift');
  await mkUser(USER_FINISHED, 'Finished');

  const now = new Date();
  const earlier = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const mid = new Date(now.getTime() - 1 * 60 * 60 * 1000);

  await prisma.timeCard.create({
    data: {
      userId: USER_ONSHIFT,
      workDate: new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`),
      clockIn: earlier,
      totalMinutes: 0,
    },
  });

  await prisma.timeCard.create({
    data: {
      userId: USER_FINISHED,
      workDate: new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`),
      clockIn: earlier,
      clockOut: mid,
      totalMinutes: 60,
    },
  });
}

async function isDisabled(page: Page, selector: string) {
  return page.$eval(selector, (el) => (el as HTMLButtonElement).disabled);
}

async function run() {
  console.log('--- Module 18 TimeCard Full Browser Tests ---');
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

    await gotoPage(page, '/staff/time-tracking', '[data-testid="time-tracking-page"]');
    await page.waitForSelector('[data-testid="time-tracking-table"]', { timeout: 30000 });

    record('T18.7 page loads with attendance table', true);

    for (const id of [USER_PENDING, USER_ONSHIFT, USER_FINISHED]) {
      const row = await page.$(`[data-testid="time-tracking-row-${id}"]`);
      if (!row) {
        record('T18.8 test employees visible in table', false, `missing ${id}`);
        break;
      }
      if (id === USER_FINISHED) record('T18.8 test employees visible in table', true);
    }

    const pendingStatus = await page.$eval(`[data-testid="time-tracking-status-${USER_PENDING}"]`, (el) =>
      el.textContent?.trim()
    );
    record('T18.9 initial status Pending', pendingStatus?.includes('Pending') ?? false, pendingStatus);

    const checkOutDisabledPending = await isDisabled(page, `[data-testid="time-tracking-check-out-${USER_PENDING}"]`);
    record('T18.10 check-out disabled when pending', checkOutDisabledPending);

    const onShiftStatus = await page.$eval(`[data-testid="time-tracking-status-${USER_ONSHIFT}"]`, (el) =>
      el.textContent?.trim()
    );
    record('T18.11 pre-seeded on-shift status', onShiftStatus?.includes('On Shift') ?? false, onShiftStatus);

    const timeInOnShift = await page.$eval(`[data-testid="time-tracking-in-${USER_ONSHIFT}"]`, (el) =>
      el.textContent?.trim()
    );
    record('T18.12 time-in displayed for on-shift', timeInOnShift !== '--:--', timeInOnShift);

    const checkInDisabledOnShift = await isDisabled(page, `[data-testid="time-tracking-check-in-${USER_ONSHIFT}"]`);
    record('T18.13 double clock-in blocked in UI', checkInDisabledOnShift);

    const onShiftBefore = await page.$eval('[data-testid="time-tracking-on-shift-count"]', (el) =>
      parseInt(el.textContent?.trim() ?? '0', 10)
    );

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/staff/time-tracking/clock-in') && res.status() === 201,
        { timeout: 20000 }
      ),
      page.click(`[data-testid="time-tracking-check-in-${USER_PENDING}"]`),
    ]);

    await page.waitForFunction(
      (id) =>
        document.querySelector(`[data-testid="time-tracking-status-${id}"]`)?.textContent?.includes('On Shift'),
      { timeout: 15000 },
      USER_PENDING
    );

    const dbOpen = await prisma.timeCard.findFirst({ where: { userId: USER_PENDING, clockOut: null } });
    record('T18.5 clock-in → DB clockOut null', dbOpen !== null);

    const onShiftAfter = await page.$eval('[data-testid="time-tracking-on-shift-count"]', (el) =>
      parseInt(el.textContent?.trim() ?? '0', 10)
    );
    record('T18.14 KPI on-shift count increments', onShiftAfter > onShiftBefore, `${onShiftBefore}→${onShiftAfter}`);

    const timeInPending = await page.$eval(`[data-testid="time-tracking-in-${USER_PENDING}"]`, (el) =>
      el.textContent?.trim()
    );
    record('T18.15 time-in updates after check-in', timeInPending !== '--:--', timeInPending);

    await page.waitForFunction(
      (id) => {
        const btn = document.querySelector(`[data-testid="time-tracking-check-out-${id}"]`) as HTMLButtonElement | null;
        return btn && !btn.disabled;
      },
      { timeout: 30000 },
      USER_PENDING
    );

    const clockOutResponse = page.waitForResponse(
      (res) => res.url().includes('/api/staff/time-tracking/clock-out') && res.status() === 200,
      { timeout: 45000 }
    );
    await page.click(`[data-testid="time-tracking-check-out-${USER_PENDING}"]`);
    try {
      await clockOutResponse;
    } catch {
      // Retry once if the first click did not trigger API under load
      await page.click(`[data-testid="time-tracking-check-out-${USER_PENDING}"]`);
      await page.waitForResponse(
        (res) => res.url().includes('/api/staff/time-tracking/clock-out') && res.status() === 200,
        { timeout: 45000 }
      );
    }

    await page.waitForFunction(
      (id) =>
        document.querySelector(`[data-testid="time-tracking-status-${id}"]`)?.textContent?.includes('Finished'),
      { timeout: 30000 },
      USER_PENDING
    );

    const dbClosed = await prisma.timeCard.findFirst({
      where: { userId: USER_PENDING, clockOut: { not: null } },
    });
    record('T18.6 clock-out → totalMinutes filled', (dbClosed?.totalMinutes ?? 0) > 0, String(dbClosed?.totalMinutes));

    await reloadPage(page, `[data-testid="time-tracking-status-${USER_FINISHED}"]`);

    const finishedStatus = await page.$eval(`[data-testid="time-tracking-status-${USER_FINISHED}"]`, (el) =>
      el.textContent?.trim()
    );
    record('T18.16 pre-seeded finished persists after reload', finishedStatus?.includes('Finished') ?? false, finishedStatus);

    const finishedHours = await page.$eval(`[data-testid="time-tracking-hours-${USER_FINISHED}"]`, (el) =>
      el.textContent?.trim()
    );
    record('T18.17 finished employee hours displayed', !finishedHours.startsWith('0.00'), finishedHours);

    const hoursToday = await page.$eval('[data-testid="time-tracking-hours-today"]', (el) =>
      parseFloat(el.textContent?.trim() ?? '0')
    );
    record('T18.18 hours today KPI > 0', hoursToday > 0, String(hoursToday));

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
