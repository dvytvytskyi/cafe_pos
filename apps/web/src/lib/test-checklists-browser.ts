/**
 * Module 10 — full manual/browser scenarios
 * Run: node --experimental-strip-types src/lib/test-checklists-browser.ts
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { checklistRepository } from '../repositories/checklist.repository.ts';
import { shiftRepository } from '../repositories/shift.repository.ts';
import { formatDateParam } from './task-dates.ts';
import { gotoPage, launchTestBrowser, waitForLoadingGone } from './browser-test-utils.ts';

const BASE = 'http://localhost:3000';

const ROLE_ID = 'role-checklist-browser';
const USER_ID = 'user-checklist-browser';
const LOCATION_ID = 'default';
const TODAY = formatDateParam(new Date());
const YESTERDAY = formatDateParam(new Date(Date.now() - 86400000));
const TASK_KEY = 'o1';
const TASK_TITLE = 'Turn on espresso machine and boiler';
const CLOSING_TASK_KEY = 'c1';
const CLOSING_TASK_TITLE = 'Run Z-Report and count final cash';

type Result = { id: string; pass: boolean; detail: string };
const results: Result[] = [];

function record(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${id}: ${detail}`);
}

async function setupDb() {
  await prisma.location.upsert({
    where: { id: LOCATION_ID },
    update: {},
    create: { id: LOCATION_ID, name: 'Default Cafe', address: 'Main St 1' },
  });
  await prisma.role.upsert({
    where: { id: ROLE_ID },
    update: {},
    create: { id: ROLE_ID, name: 'Checklist Browser', permissions: {} },
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { status: 'active' },
    create: {
      id: USER_ID,
      name: 'Checklist Browser User',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'active',
    },
  });
  await checklistRepository.ensureDefaultTemplates();
  await prisma.dailyChecklist.deleteMany({
    where: {
      OR: [
        { taskKey: TASK_KEY, locationKey: 'gotico' },
        { taskKey: CLOSING_TASK_KEY, locationKey: 'gotico' },
        { taskKey: 'o4', locationKey: 'gotico' },
      ],
    },
  });
  const active = await shiftRepository.findActiveShift(LOCATION_ID);
  if (!active) {
    await shiftRepository.openShift(LOCATION_ID, USER_ID, 100);
  }
}

async function cleanupDb() {
  await prisma.dailyChecklist.deleteMany({
    where: {
      OR: [
        { taskKey: TASK_KEY, locationKey: 'gotico' },
        { taskKey: CLOSING_TASK_KEY, locationKey: 'gotico' },
        { taskKey: 'o4', locationKey: 'gotico' },
      ],
    },
  });
  await prisma.cashShift.deleteMany({ where: { userId: USER_ID } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: USER_ID } }).catch(() => {});
  await prisma.role.deleteMany({ where: { id: ROLE_ID } }).catch(() => {});
}

async function openChecklistsTab(page: puppeteer.Page) {
  await gotoPage(page, '/operations?tab=checklists', '[data-testid="checklist-date-nav"]');
  await waitForLoadingGone(page, 'Loading checklists');
}

async function getSelectedDateIso(page: puppeteer.Page): Promise<string> {
  return page.$eval('[data-testid="checklist-date-picker"]', (el) =>
    el.getAttribute('data-date-iso') ?? ''
  );
}

async function clickPrevDay(page: puppeteer.Page) {
  const before = await getSelectedDateIso(page);
  await page.click('[data-testid="checklist-prev-day"]');
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector('[data-testid="checklist-date-picker"]');
      return el?.getAttribute('data-date-iso') !== prev;
    },
    { timeout: 10000 },
    before
  );
}

async function clickNextDay(page: puppeteer.Page) {
  const before = await getSelectedDateIso(page);
  await page.click('[data-testid="checklist-next-day"]');
  await page.waitForFunction(
    (prev) => {
      const el = document.querySelector('[data-testid="checklist-date-picker"]');
      return el?.getAttribute('data-date-iso') !== prev;
    },
    { timeout: 10000 },
    before
  );
}

async function clickTask(page: puppeteer.Page, loc: string, taskKey: string) {
  const sel = `[data-testid="checklist-task-${loc}-${taskKey}"]`;
  await page.waitForSelector(sel, { timeout: 15000 });
  const responseWait = page
    .waitForResponse(
      (res) => res.url().includes('/api/checklists') && res.request().method() === 'POST',
      { timeout: 15000 }
    )
    .catch(() => null);
  await page.click(sel);
  await responseWait;
}

async function isTaskCompleted(page: puppeteer.Page, loc: string, taskKey: string) {
  const sel = `[data-testid="checklist-task-${loc}-${taskKey}"]`;
  return page.$eval(sel, (el) => el.getAttribute('data-completed') === 'true');
}

async function getAlert(page: puppeteer.Page) {
  return page.evaluate(() => document.querySelector('[role=alert]')?.textContent?.trim() ?? null);
}

async function waitForChecklistsLoaded(page: puppeteer.Page) {
  await waitForLoadingGone(page, 'Loading checklists');
}

async function run() {
  console.log('--- Module 10 DailyChecklists Browser Tests ---');

  let browser: puppeteer.Browser | null = null;
  let lastPostStatus = 0;

  try {
    await setupDb();

    browser = await launchTestBrowser();
    const page = await browser.newPage();

    page.on('response', (res) => {
      const url = res.url();
      if (url.includes('/api/checklists') && res.request().method() === 'POST') {
        lastPostStatus = res.status();
      }
    });

    await openChecklistsTab(page);

    // T10.5 — check item → API → DB
    lastPostStatus = 0;
    await clickTask(page, 'gotico', TASK_KEY);
    const completedAfterCheck = await isTaskCompleted(page, 'gotico', TASK_KEY);
    const dbAfterCheck = await prisma.dailyChecklist.findFirst({
      where: {
        taskKey: TASK_KEY,
        locationKey: 'gotico',
        scheduledDate: new Date(TODAY),
        shiftType: 'opening',
        completed: true,
      },
    });
    record(
      'T10.5',
      lastPostStatus === 201 && completedAfterCheck && !!dbAfterCheck?.completedById,
      `POST=${lastPostStatus} UI=${completedAfterCheck} DB=${!!dbAfterCheck}`
    );

    // T10.5b — uncheck item
    lastPostStatus = 0;
    await clickTask(page, 'gotico', TASK_KEY);
    const completedAfterUncheck = await isTaskCompleted(page, 'gotico', TASK_KEY);
    const dbAfterUncheck = await prisma.dailyChecklist.findFirst({
      where: {
        taskKey: TASK_KEY,
        locationKey: 'gotico',
        scheduledDate: new Date(TODAY),
        shiftType: 'opening',
      },
    });
    record(
      'T10.5b',
      lastPostStatus === 201 && !completedAfterUncheck && dbAfterUncheck?.completed === false,
      `POST=${lastPostStatus} UI=${!completedAfterUncheck} DB completed=${dbAfterUncheck?.completed}`
    );

    // Re-check for reload test
    await clickTask(page, 'gotico', TASK_KEY);

    // T10.5c — reload persists state
    await gotoPage(page, '/operations?tab=checklists', '[data-testid="checklist-date-nav"]');
    await waitForChecklistsLoaded(page);
    const persisted = await isTaskCompleted(page, 'gotico', TASK_KEY);
    record('T10.5c', persisted, `UI completed after reload=${persisted}`);

    // T10.6 — yesterday in UI → 403 alert, no DB row
    lastPostStatus = 0;
    await clickPrevDay(page);
    const dateIso = await getSelectedDateIso(page);
    await clickTask(page, 'gotico', TASK_KEY);
    const alertPast = await getAlert(page);
    const pastDbCount = await prisma.dailyChecklist.count({
      where: {
        taskKey: TASK_KEY,
        locationKey: 'gotico',
        scheduledDate: new Date(YESTERDAY),
        completed: true,
      },
    });
    record(
      'T10.6',
      dateIso === YESTERDAY &&
        (lastPostStatus === 403 || /past|Cannot edit/i.test(alertPast ?? '')) &&
        pastDbCount === 0,
      `date=${dateIso} POST=${lastPostStatus} alert=${alertPast ?? 'none'} pastRows=${pastDbCount}`
    );

    // Return to today
    await clickNextDay(page);
    await waitForChecklistsLoaded(page);

    // T10.2-ui — closed shift blocks check
    await prisma.dailyChecklist.deleteMany({
      where: { taskKey: 'o4', locationKey: 'gotico', scheduledDate: new Date(TODAY) },
    });
    const openShift = await shiftRepository.findActiveShift(LOCATION_ID);
    if (openShift) {
      await shiftRepository.closeShift(openShift.id, 100);
    }
    lastPostStatus = 0;
    await clickTask(page, 'gotico', 'o4'); // different task — croissants, no photo
    const alertShift = await getAlert(page);
    const shiftBlockedDb = await prisma.dailyChecklist.count({
      where: {
        taskKey: 'o4',
        locationKey: 'gotico',
        scheduledDate: new Date(TODAY),
        completed: true,
      },
    });
    record(
      'T10.2-ui',
      (lastPostStatus === 403 || /shift|closed/i.test(alertShift ?? '')) && shiftBlockedDb === 0,
      `POST=${lastPostStatus} alert=${alertShift ?? 'none'} dbRows=${shiftBlockedDb}`
    );

    // Re-open shift for closing tab test
    await shiftRepository.openShift(LOCATION_ID, USER_ID, 100);

    // T10-extra — closing shift tab loads closing tasks
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Evening Closing')
      )?.click();
    });
    await waitForChecklistsLoaded(page);
    const closingVisible = await page.evaluate((title) => {
      return [...document.querySelectorAll('span')].some((s) => s.textContent?.trim() === title);
    }, CLOSING_TASK_TITLE);
    const openingHidden = await page.evaluate((title) => {
      return [...document.querySelectorAll('span')].some((s) => s.textContent?.trim() === title);
    }, TASK_TITLE);
    record(
      'T10-extra-closing',
      closingVisible && !openingHidden,
      `closingVisible=${closingVisible} openingHidden=${!openingHidden}`
    );

    // T10-extra — complete closing task (photo required opens modal, not POST yet)
    await prisma.dailyChecklist.deleteMany({
      where: {
        taskKey: CLOSING_TASK_KEY,
        locationKey: 'gotico',
        scheduledDate: new Date(TODAY),
      },
    });
    await gotoPage(page, '/operations?tab=checklists', '[data-testid="checklist-date-nav"]');
    await waitForChecklistsLoaded(page);
    await page.evaluate(() => {
      [...document.querySelectorAll('button')].find((b) =>
        b.textContent?.includes('Evening Closing')
      )?.click();
    });
    await waitForChecklistsLoaded(page);
    lastPostStatus = 0;
    await clickTask(page, 'gotico', CLOSING_TASK_KEY);
    await page.waitForSelector('[data-testid="photo-proof-modal"]', { timeout: 10000 }).catch(() => null);
    const modalOpen = !!(await page.$('[data-testid="photo-proof-modal"]'));
    const closingDbBeforePhoto = await prisma.dailyChecklist.count({
      where: {
        taskKey: CLOSING_TASK_KEY,
        locationKey: 'gotico',
        scheduledDate: new Date(TODAY),
        completed: true,
      },
    });
    record(
      'T10-extra-photo-modal',
      modalOpen && lastPostStatus !== 201 && closingDbBeforePhoto === 0,
      `modal=${modalOpen} POST=${lastPostStatus} dbCompleted=${closingDbBeforePhoto}`
    );

    const failed = results.filter((r) => !r.pass);
    if (failed.length) {
      console.error('\nFailed:', failed);
      process.exitCode = 1;
    } else {
      console.log('\n✅ Module 10 browser tests passed.');
    }
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupDb().catch(() => {});
    await disconnectDb();
    process.exit(process.exitCode ?? 0);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
