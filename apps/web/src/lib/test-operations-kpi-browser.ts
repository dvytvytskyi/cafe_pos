/**
 * Module 12 — full manual/browser scenarios
 * Run: node --experimental-strip-types src/lib/test-operations-kpi-browser.ts
 */
import puppeteer from 'puppeteer-core';
import { prisma, disconnectDb } from './db.ts';
import { checklistRepository } from '../repositories/checklist.repository.ts';
import { shiftRepository } from '../repositories/shift.repository.ts';
import { operationsKpiRepository } from '../repositories/operations-kpi.repository.ts';
import { formatDateParam } from './task-dates.ts';
import { gotoPage, launchTestBrowser, reloadPage, waitForLoadingGone } from './browser-test-utils.ts';

const BASE = 'http://localhost:3000';
const ROLE_ID = 'role-kpi-browser';
const USER_ID = 'user-kpi-browser';
const LOCATION_ID = 'default';
const TODAY = formatDateParam(new Date());
const TASK_IDS = ['T-KPI-B1', 'T-KPI-B2', 'T-KPI-B3'];
const CHECKLIST_KEY = 'o1';

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
    create: { id: ROLE_ID, name: 'KPI Browser', permissions: {} },
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { status: 'active' },
    create: {
      id: USER_ID,
      name: 'KPI Browser User',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'active',
    },
  });

  await checklistRepository.ensureDefaultTemplates();

  await prisma.task.deleteMany({ where: { scheduledDate: new Date(TODAY) } });
  await prisma.task.createMany({
    data: [
      {
        id: 'T-KPI-B1',
        title: 'KPI Browser Todo',
        scheduledDate: new Date(TODAY),
        status: 'todo',
        assigneeIds: [],
      },
      {
        id: 'T-KPI-B2',
        title: 'KPI Browser In Progress',
        scheduledDate: new Date(TODAY),
        status: 'in_progress',
        assigneeIds: [],
      },
      {
        id: 'T-KPI-B3',
        title: 'KPI Browser Done',
        scheduledDate: new Date(TODAY),
        status: 'completed',
        assigneeIds: [],
      },
    ],
  });

  await prisma.dailyChecklist.deleteMany({
    where: {
      taskKey: CHECKLIST_KEY,
      locationKey: 'gotico',
      scheduledDate: new Date(TODAY),
      shiftType: 'opening',
    },
  });

  if (!(await shiftRepository.findActiveShift(LOCATION_ID))) {
    await shiftRepository.openShift(LOCATION_ID, USER_ID, 100);
  }
}

async function cleanupDb() {
  await prisma.dailyChecklist.deleteMany({
    where: {
      taskKey: CHECKLIST_KEY,
      locationKey: 'gotico',
      scheduledDate: new Date(TODAY),
    },
  });
  await prisma.task.deleteMany({ where: { id: { in: TASK_IDS } } });
  await prisma.cashShift.deleteMany({ where: { userId: USER_ID } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: USER_ID } }).catch(() => {});
  await prisma.role.deleteMany({ where: { id: ROLE_ID } }).catch(() => {});
}

async function readKpiCard(page: puppeteer.Page, testId: string) {
  return page.$eval(`[data-testid="${testId}"]`, (el) => ({
    value: el.querySelector('p.text-2xl')?.textContent?.trim() ?? '',
    sub: el.querySelector('p.text-\\[11px\\]')?.textContent?.trim() ?? '',
  }));
}

async function waitForKpiBar(page: puppeteer.Page) {
  await page.waitForSelector('[data-testid="operations-kpi-bar"]', { timeout: 30000 });
}

async function openTasksTab(page: puppeteer.Page) {
  await gotoPage(page, '/operations?tab=tasks', '[data-testid="operations-kpi-bar"]');
}

async function openChecklistsTab(page: puppeteer.Page) {
  await gotoPage(page, '/operations?tab=checklists', '[data-testid="checklist-date-nav"]');
  await waitForLoadingGone(page, 'Loading checklists');
  await waitForKpiBar(page);
}

async function switchToTab(page: puppeteer.Page, tab: 'tasks' | 'checklists') {
  const label = tab === 'tasks' ? 'Tasks' : "Daily SOP's";
  await page.evaluate((text) => {
    [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text))?.click();
  }, label);
  if (tab === 'checklists') {
    await waitForLoadingGone(page, 'Loading checklists');
  }
  await waitForKpiBar(page);
}

async function completeTaskViaModal(page: puppeteer.Page, title: string) {
  await page.waitForFunction(
    (t) => [...document.querySelectorAll('h4')].some((h) => h.textContent?.includes(t)),
    { timeout: 20000 },
    title
  );
  await page.evaluate((t) => {
    const heading = [...document.querySelectorAll('h4')].find((h) => h.textContent?.includes(t));
    heading?.closest('div[class*="cursor-pointer"]')?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }, title);
  await page.waitForSelector('[data-testid="task-status-select"]', { timeout: 15000 });
  await page.select('[data-testid="task-status-select"]', 'completed');
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-testid="task-save-btn"]')?.click();
  });
  await page.waitForFunction(
    () => !document.querySelector('[data-testid="task-status-select"]'),
    { timeout: 15000 }
  );
}

async function waitForKpiValue(
  page: puppeteer.Page,
  testId: string,
  predicate: (value: string) => boolean,
  attempts = 20
) {
  for (let i = 0; i < attempts; i++) {
    const card = await readKpiCard(page, testId);
    if (predicate(card.value)) return card;
    await new Promise((r) => setTimeout(r, 500));
  }
  return readKpiCard(page, testId);
}

async function run() {
  console.log('--- Module 12 Operations KPI Browser Tests (detailed manual) ---');

  let browser: puppeteer.Browser | null = null;
  let exitCode = 0;

  try {
    await setupDb();
    const shift = await shiftRepository.findActiveShift(LOCATION_ID);
    const expectedKpi = await operationsKpiRepository.getKpi(TODAY, shift?.id);

    browser = await launchTestBrowser();
    const page = await browser.newPage();

    // T12-M1 — KPI bar renders 4 cards on tasks tab
    await openTasksTab(page);
    const cardIds = ['kpi-tasks-percent', 'kpi-tasks-total', 'kpi-sop-percent', 'kpi-in-progress'];
    const missingCards: string[] = [];
    for (const id of cardIds) {
      if (!(await page.$(`[data-testid="${id}"]`))) missingCards.push(id);
    }
    record('T12-M1', missingCards.length === 0, missingCards.length ? `missing: ${missingCards.join(', ')}` : '4 KPI cards visible');

    // T12-M2 — KPI bar persists on checklists tab
    await switchToTab(page, 'checklists');
    const onChecklists = !!(await page.$('[data-testid="operations-kpi-bar"]'));
    record('T12-M2', onChecklists, `KPI bar on checklists tab=${onChecklists}`);

    // T12-M3 — seeded task counts match API/repository
    await switchToTab(page, 'tasks');
    const tasksTotal = await readKpiCard(page, 'kpi-tasks-total');
    const tasksPercent = await readKpiCard(page, 'kpi-tasks-percent');
    const inProgress = await readKpiCard(page, 'kpi-in-progress');
    const matchApi =
      tasksTotal.value === String(expectedKpi.tasks.total) &&
      tasksPercent.value === `${expectedKpi.tasks.completionPercent}%` &&
      inProgress.value === String(
        (expectedKpi.tasks.byStatus.in_progress ?? 0) + (expectedKpi.tasks.byStatus.in_review ?? 0)
      );
    record(
      'T12-M3',
      matchApi,
      `UI total=${tasksTotal.value} pct=${tasksPercent.value} inProg=${inProgress.value} | API total=${expectedKpi.tasks.total} pct=${expectedKpi.tasks.completionPercent}%`
    );

    // T12-M4 — no NaN / empty crash on zero-task edge (UI shows valid strings)
    const noNan =
      !tasksPercent.value.includes('NaN') &&
      !tasksTotal.value.includes('NaN') &&
      (tasksPercent.value.includes('%') || tasksPercent.value === '—');
    record('T12-M4', noNan, `tasksPercent=${tasksPercent.value} (no NaN)`);

    // T12.4 — complete task → KPI updates without page refresh
    const beforePct = tasksPercent.value;
    await completeTaskViaModal(page, 'KPI Browser Todo');
    const afterComplete = await waitForKpiValue(page, 'kpi-tasks-percent', (v) => v !== beforePct);
    const dbTodo = await prisma.task.findUnique({ where: { id: 'T-KPI-B1' } });
    record(
      'T12.4',
      dbTodo?.status === 'completed' && afterComplete.value !== beforePct && !afterComplete.value.includes('NaN'),
      `before=${beforePct} after=${afterComplete.value} dbStatus=${dbTodo?.status}`
    );

    // T12-M5 — reload preserves updated KPI
    await reloadPage(page, '[data-testid="operations-kpi-bar"]');
    await waitForKpiBar(page);
    const afterReload = await readKpiCard(page, 'kpi-tasks-percent');
    record(
      'T12-M5',
      afterReload.value === afterComplete.value,
      `reload pct=${afterReload.value} expected=${afterComplete.value}`
    );

    // T12-M6 — checklist check → SOP KPI updates without refresh
    await switchToTab(page, 'checklists');
    await waitForLoadingGone(page, 'Loading checklists');
    const sopBefore = await readKpiCard(page, 'kpi-sop-percent');
    const checklistSel = `[data-testid="checklist-task-gotico-${CHECKLIST_KEY}"]`;
    await page.waitForSelector(checklistSel, { timeout: 15000 });
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/checklists') && res.request().method() === 'POST',
        { timeout: 15000 }
      ),
      page.click(checklistSel),
    ]).catch(() => page.click(checklistSel));
    const sopAfter = await waitForKpiValue(
      page,
      'kpi-sop-percent',
      (v) => v !== sopBefore.value && v.includes('%')
    );
    const checklistRow = await prisma.dailyChecklist.findFirst({
      where: {
        taskKey: CHECKLIST_KEY,
        locationKey: 'gotico',
        scheduledDate: new Date(TODAY),
        shiftType: 'opening',
        completed: true,
      },
    });
    record(
      'T12-M6',
      !!checklistRow && sopAfter.value !== sopBefore.value,
      `SOP before=${sopBefore.value} after=${sopAfter.value} DB=${!!checklistRow}`
    );

    // T12-M7 — tab switch back to tasks keeps KPI bar + updated values
    await switchToTab(page, 'tasks');
    const tasksAfterSwitch = await readKpiCard(page, 'kpi-tasks-percent');
    const barVisible = !!(await page.$('[data-testid="operations-kpi-bar"]'));
    record(
      'T12-M7',
      barVisible && tasksAfterSwitch.value === afterReload.value,
      `bar=${barVisible} tasksPct=${tasksAfterSwitch.value}`
    );

    // T12-M8 — direct API matches UI after all mutations
    const freshKpi = await operationsKpiRepository.getKpi(TODAY, shift?.id);
    const uiFinal = await readKpiCard(page, 'kpi-tasks-total');
    const sopFinal = await readKpiCard(page, 'kpi-sop-percent');
    record(
      'T12-M8',
      uiFinal.value === String(freshKpi.tasks.total) && sopFinal.value === `${freshKpi.checklists.completionPercent}%`,
      `UI tasks=${uiFinal.value} SOP=${sopFinal.value} | API tasks=${freshKpi.tasks.total} SOP=${freshKpi.checklists.completionPercent}%`
    );

    const failed = results.filter((r) => !r.pass);
    console.log('\n--- Summary ---');
    console.log(`Passed: ${results.length - failed.length}/${results.length}`);
    if (failed.length > 0) {
      failed.forEach((f) => console.log(`  FAIL ${f.id}: ${f.detail}`));
      exitCode = 1;
    } else {
      console.log('✅ Module 12 detailed browser tests passed.');
    }
  } catch (err) {
    console.error(err);
    exitCode = 1;
  } finally {
    if (browser) await browser.close().catch(() => {});
    await cleanupDb().catch(() => {});
    await disconnectDb();
    process.exit(exitCode);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run();
}
