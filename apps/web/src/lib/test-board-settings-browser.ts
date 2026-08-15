/**
 * Module 9 — remaining manual/browser scenarios (M9-extra)
 * Run: node --experimental-strip-types src/lib/test-board-settings-browser.ts
 */
import puppeteer from 'puppeteer-core';
import assert from 'assert';
import { formatDateParam } from './task-dates.ts';
import { launchTestBrowser, gotoPage, reloadPage } from './browser-test-utils.ts';

const BASE = 'http://localhost:3000';

type Result = { id: string; pass: boolean; detail: string };

const results: Result[] = [];

function record(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${id}: ${detail}`);
}

async function waitForHeadings(page: puppeteer.Page, min = 3) {
  await page.waitForFunction(
    (n) => document.querySelectorAll('h3').length >= n,
    { timeout: 15000 },
    min
  );
}

async function openTaskSettings(page: puppeteer.Page) {
  await gotoPage(page, '/operations?tab=tasks', '[data-testid="task-board-settings-btn"]');
  await page.evaluate(() => {
    document.querySelector<HTMLElement>('[data-testid="task-board-settings-btn"]')?.scrollIntoView({ block: 'center' });
  });
  await page.evaluate(() => {
    document.querySelector<HTMLButtonElement>('[data-testid="task-board-settings-btn"]')?.click();
  });
  await page.waitForSelector('[data-testid="board-settings-modal"]', { timeout: 15000 });
}

async function openOrdersSettings(page: puppeteer.Page) {
  await gotoPage(page, '/orders?tab=delivery');
  await page.waitForFunction(
    () =>
      [...document.querySelectorAll('button')].some((b) =>
        b.textContent?.includes('Board Settings')
      ),
    { timeout: 60000 }
  );
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Board Settings'))
      ?.click();
  });
  await page.waitForSelector('[data-testid="board-settings-modal"]', { timeout: 15000 });
}

async function clickSave(page: puppeteer.Page) {
  const putWait = page.waitForResponse(
    (res) => res.url().includes('/api/settings/board') && res.request().method() === 'PUT',
    { timeout: 12000 }
  );
  await page.evaluate(() => {
    [...document.querySelectorAll('button')]
      .find((b) => b.textContent?.trim() === 'Save Changes')
      ?.click();
  });
  await Promise.race([
    putWait,
    page.waitForSelector('[role=alert]', { timeout: 5000 }),
  ]).catch(() => {});
}

async function getAlert(page: puppeteer.Page, timeout = 5000) {
  await page.waitForFunction(
    () =>
      document.querySelector('[role=alert]') ||
      document.body.textContent?.includes('Board Columns'),
    { timeout }
  ).catch(() => {});
  return page.evaluate(() => document.querySelector('[role=alert]')?.textContent ?? null);
}

async function typeIntoReactInput(page: puppeteer.Page, selector: string, value: string, inModal = true) {
  const inputHandle = await page.evaluateHandle(
    (sel, modalOnly) => {
      const root = modalOnly
        ? (document.querySelector('[data-testid="board-settings-modal"]') ??
            document.querySelector('h2')?.closest('.rounded-3xl') ??
            document)
        : document;
      const input = root.querySelector(sel) as HTMLInputElement | null;
      if (!input) throw new Error(`Input not found: ${sel}`);
      return input;
    },
    selector,
    inModal
  );
  const input = inputHandle.asElement();
  if (!input) throw new Error(`Input element not found: ${selector}`);

  await input.focus();
  await input.evaluate((el) => {
    const inputEl = el as HTMLInputElement;
    inputEl.select();
    inputEl.setSelectionRange(0, inputEl.value.length);
  });
  await page.keyboard.press('Backspace');
  if (value !== '') {
    await page.keyboard.type(value, { delay: 15 });
  }
  await inputHandle.dispose();
}

async function setReactInput(page: puppeteer.Page, selector: string, value: string, inModal = true) {
  await typeIntoReactInput(page, selector, value, inModal);
}

async function clickModalAdd(page: puppeteer.Page) {
  await page.evaluate(() => {
    const modal = document.querySelector('h2')?.closest('.rounded-3xl');
    [...(modal?.querySelectorAll('button') ?? [])]
      .find((b) => b.textContent?.trim() === 'Add')
      ?.click();
  });
}

async function deleteModalColumnByLabel(page: puppeteer.Page, label: string) {
  await page.evaluate((name) => {
    const modal = document.querySelector('h2')?.closest('.rounded-3xl');
    const rows = [...(modal?.querySelectorAll('[draggable=true]') ?? [])];
    const row = rows.find((r) => (r.querySelector('input') as HTMLInputElement)?.value === name);
    const btn = row?.querySelector('button');
    btn?.click();
  }, label);
}

async function getModalColumnLabels(page: puppeteer.Page) {
  return page.evaluate(() => {
    const modal = document.querySelector('h2')?.closest('.rounded-3xl');
    return [...(modal?.querySelectorAll('[draggable=true] input') ?? [])].map(
      (i) => (i as HTMLInputElement).value
    );
  });
}

async function getModalDeleteButtonCount(page: puppeteer.Page) {
  return page.evaluate(() => {
    const modal = document.querySelector('h2')?.closest('.rounded-3xl');
    return [...(modal?.querySelectorAll('[draggable=true]') ?? [])].filter((row) =>
      row.querySelector('button')
    ).length;
  });
}

async function getBoardHeadings(page: puppeteer.Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll('h3')].map((h) => h.textContent?.trim())
  );
}

async function runOrdersBoardTests(page: puppeteer.Page) {
  // Reset orders board to defaults before browser scenarios
  await fetch(`${BASE}/api/settings/board?type=orders&locationId=default`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stages: [
        { id: 'incoming', label: 'Incoming', color: 'bg-yellow-500' },
        { id: 'preparing', label: 'Preparing', color: 'bg-orange-500' },
        { id: 'served', label: 'Served', color: 'bg-indigo-500' },
        { id: 'ready', label: 'Ready for Pickup', color: 'bg-green-500' },
        { id: 'completed', label: 'Completed', color: 'bg-purple-500' },
        { id: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
      ],
    }),
  });

  // M9-O1 Orders rename + persist
  await openOrdersSettings(page);
  await setReactInput(page, '[draggable=true] input', 'Orders Renamed Incoming');
  const modalLabel = await page.evaluate(() => {
    const modal =
      document.querySelector('[data-testid="board-settings-modal"]') ??
      document.querySelector('h2')?.closest('.rounded-3xl');
    return (modal?.querySelector('[draggable=true] input') as HTMLInputElement | null)?.value ?? '';
  });
  if (modalLabel !== 'Orders Renamed Incoming') {
    await setReactInput(page, '[draggable=true] input', 'Orders Renamed Incoming');
  }
  await clickSave(page);
  await page
    .waitForResponse(
      (res) =>
        res.url().includes('/api/settings/board') &&
        res.request().method() === 'PUT' &&
        res.status() < 400,
      { timeout: 20000 }
    )
    .catch(() => {});
  await page.waitForFunction(
    () => !document.body.textContent?.includes('Board Columns'),
    { timeout: 5000 }
  ).catch(() => {});

  const apiAfterSave = await fetch(`${BASE}/api/settings/board?type=orders&locationId=default`).then((r) =>
    r.json()
  );
  const apiLabel = apiAfterSave.stages?.[0]?.label ?? '';
  if (apiLabel !== 'Orders Renamed Incoming') {
    record(
      'M9-O1',
      false,
      `Save did not persist rename (api="${apiLabel}")`
    );
  } else {
  await reloadPage(page);
  await page
    .waitForFunction(
      () =>
        [...document.querySelectorAll('h3')].some(
          (h) => h.textContent?.trim() === 'Orders Renamed Incoming'
        ),
      { timeout: 20000 }
    )
    .catch(() => {});
  await waitForHeadings(page, 4);
  await new Promise((r) => setTimeout(r, 500));
  const orderHeadings = await getBoardHeadings(page);
  record(
    'M9-O1',
    orderHeadings[0] === 'Orders Renamed Incoming',
    `Orders rename after refresh: first column = "${orderHeadings[0]}" (api="${apiLabel}")`
  );
  }

  // Restore incoming label before locked-stage checks
  await fetch(`${BASE}/api/settings/board?type=orders&locationId=default`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stages: [
        { id: 'incoming', label: 'Incoming', color: 'bg-yellow-500' },
        { id: 'preparing', label: 'Preparing', color: 'bg-orange-500' },
        { id: 'served', label: 'Served', color: 'bg-indigo-500' },
        { id: 'ready', label: 'Ready for Pickup', color: 'bg-green-500' },
        { id: 'completed', label: 'Completed', color: 'bg-purple-500' },
        { id: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
      ],
    }),
  });
  await reloadPage(page);

  // M9-O2 Locked stages — no delete buttons in modal
  await openOrdersSettings(page);
  const deleteBtns = await getModalDeleteButtonCount(page);
  record(
    'M9-O2',
    deleteBtns === 0,
    `Orders locked stages: trash buttons in modal = ${deleteBtns} (expected 0)`
  );

  // M9-O3 Add custom orders column + persist
  await setReactInput(page, 'input[placeholder="e.g. Backlog"]', 'Custom Pickup');
  await clickModalAdd(page);
  await new Promise((r) => setTimeout(r, 300));
  const labelsBeforeSave = await getModalColumnLabels(page);
  const hasCustom = labelsBeforeSave.includes('Custom Pickup');
  await clickSave(page);
  await reloadPage(page);
  await waitForHeadings(page, 4);
  await openOrdersSettings(page);
  const labelsAfter = await getModalColumnLabels(page);
  record(
    'M9-O3',
    hasCustom && labelsAfter.includes('Custom Pickup'),
    `Custom orders column persisted: ${labelsAfter.includes('Custom Pickup')}`
  );

  // cleanup custom column + restore orders label via API
  await fetch(`${BASE}/api/settings/board?type=orders&locationId=default`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stages: [
        { id: 'incoming', label: 'Incoming', color: 'bg-yellow-500' },
        { id: 'preparing', label: 'Preparing', color: 'bg-orange-500' },
        { id: 'served', label: 'Served', color: 'bg-indigo-500' },
        { id: 'ready', label: 'Ready for Pickup', color: 'bg-green-500' },
        { id: 'completed', label: 'Completed', color: 'bg-purple-500' },
        { id: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
      ],
    }),
  });
}

async function runTaskExtraTests(page: puppeteer.Page) {
  // M9-T1 Save with empty renamed column blocked
  await openTaskSettings(page);
  await page.waitForSelector('[data-testid="board-settings-modal"]', { timeout: 15000 });
  await typeIntoReactInput(page, '[draggable=true] input', '');
  await clickSave(page);
  const alertEmpty = await getAlert(page);
  const stillOpen = await page.evaluate(() =>
    !!document.querySelector('[data-testid="board-settings-modal"]')
  );
  record(
    'M9-T1',
    !!alertEmpty?.toLowerCase().includes('empty') && stillOpen,
    `Save empty rename blocked: alert="${alertEmpty}", modal open=${stillOpen}`
  );
  if (stillOpen) {
    await typeIntoReactInput(page, '[draggable=true] input', 'To Do');
  } else {
    await openTaskSettings(page);
    await page.waitForSelector('[data-testid="board-settings-modal"]', { timeout: 15000 });
  }

  // M9-T2 Add empty column blocked (UI)
  await setReactInput(page, 'input[placeholder="e.g. Backlog"]', '');
  await clickModalAdd(page);
  const alertAddEmpty = await getAlert(page);
  record(
    'M9-T2',
    !!alertAddEmpty?.toLowerCase().includes('empty'),
    `Add empty column blocked: "${alertAddEmpty}"`
  );

  // M9-T3 Delete empty custom column
  await setReactInput(page, 'input[placeholder="e.g. Backlog"]', 'Temp Delete Col');
  await clickModalAdd(page);
  await new Promise((r) => setTimeout(r, 300));
  const beforeDelete = (await getModalColumnLabels(page)).length;
  await deleteModalColumnByLabel(page, 'Temp Delete Col');
  await new Promise((r) => setTimeout(r, 300));
  const afterDelete = (await getModalColumnLabels(page)).length;
  record(
    'M9-T3',
    afterDelete === beforeDelete - 1,
    `Delete empty custom column: ${beforeDelete} → ${afterDelete}`
  );
  await clickSave(page);

  // M9-T4 Delete column with tasks + migration
  await openTaskSettings(page);

  await setReactInput(page, 'input[placeholder="e.g. Backlog"]', 'Migrate Me');
  await clickModalAdd(page);
  await clickSave(page);

  let settings = await fetch(`${BASE}/api/settings/board?type=tasks&locationId=default`).then((r) =>
    r.json()
  );
  for (let i = 0; i < 15 && !settings.stages?.some((s: { label: string }) => s.label === 'Migrate Me'); i++) {
    await new Promise((r) => setTimeout(r, 200));
    settings = await fetch(`${BASE}/api/settings/board?type=tasks&locationId=default`).then((r) => r.json());
  }
  const migrateStage = settings.stages.find((s: { label: string }) => s.label === 'Migrate Me');
  assert.ok(migrateStage, 'Migrate Me stage should exist');

  const today = formatDateParam(new Date());
  const taskRes = await fetch(`${BASE}/api/tasks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: `T-M9-MIG-${Date.now().toString().slice(-6)}`,
      title: 'Migration Test Task M9',
      status: migrateStage.id,
      scheduledDate: today,
      assignees: [],
    }),
  });
  assert.strictEqual(taskRes.status, 201, 'task create should succeed');
  const createdTask = await taskRes.json();

  await gotoPage(page, '/operations?tab=tasks', '[data-testid="task-board-settings-btn"]');
  await waitForHeadings(page, 6);
  await page.waitForFunction(
    (title) => [...document.querySelectorAll('h4')].some((h) => h.textContent?.includes(title)),
    { timeout: 30000 },
    'Migration Test Task M9'
  );
  await reloadPage(page, '[data-testid="task-board-settings-btn"]');
  await page.waitForFunction(
    (title) => [...document.querySelectorAll('h4')].some((h) => h.textContent?.includes(title)),
    { timeout: 20000 },
    'Migration Test Task M9'
  );
  await openTaskSettings(page);
  await page.waitForFunction(
    () => {
      const modal = document.querySelector('[data-testid="board-settings-modal"]');
      if (!modal) return false;
      const row = [...modal.querySelectorAll('[draggable=true]')].find(
        (r) => (r.querySelector('input') as HTMLInputElement | null)?.value === 'Migrate Me'
      );
      const countText = row?.textContent ?? '';
      return /[1-9]\d*\s+tasks/i.test(countText);
    },
    { timeout: 15000 }
  );
  await deleteModalColumnByLabel(page, 'Migrate Me');
  await page.waitForFunction(
    () =>
      document.body.textContent?.includes('Column has active') &&
      [...document.querySelectorAll('button')].some((b) => b.textContent?.includes('Move & Delete')),
    { timeout: 20000 }
  );
  await Promise.all([
    page.waitForResponse(
      (res) => res.url().includes('/api/settings/board') && res.request().method() === 'PUT',
      { timeout: 15000 }
    ),
    page.evaluate(() => {
      [...document.querySelectorAll('button')]
        .find((b) => b.textContent?.includes('Move & Delete'))
        ?.click();
    }),
  ]).catch(() => {});

  const migrateTarget =
    settings.stages.find((s: { id: string }) => s.id !== migrateStage.id)?.id ?? 'todo';

  let taskFinal = await fetch(`${BASE}/api/tasks/${createdTask.id}`).then((r) => r.json());
  for (let i = 0; i < 15 && taskFinal.status !== migrateTarget; i++) {
    await new Promise((r) => setTimeout(r, 500));
    taskFinal = await fetch(`${BASE}/api/tasks/${createdTask.id}`).then((r) => r.json());
  }

  record(
    'M9-T4',
    taskFinal.status === migrateTarget && !(await getBoardHeadings(page)).includes('Migrate Me'),
    `Task migrated to ${migrateTarget} (${taskFinal.status}), column removed`
  );

  // cleanup task
  await fetch(`${BASE}/api/tasks/${createdTask.id}`, { method: 'DELETE' });
}

async function waitForServer() {
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE}/api/settings/board?type=tasks`);
      const text = await res.text();
      if (text.startsWith('{')) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error('Server API not ready');
}

async function runApiExtraTests() {
  // M9-A1 separate locationId
  const loc = 'test-loc-m9';
  const stages = [
    { id: 'a', label: 'Alpha', color: 'bg-blue-500' },
    { id: 'b', label: 'Beta', color: 'bg-green-500' },
  ];
  const put = await fetch(`${BASE}/api/settings/board?type=tasks&locationId=${loc}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ stages }),
  });
  const putText = await put.text();
  const putData = putText.startsWith('{') ? JSON.parse(putText) : null;
  const getRes = await fetch(`${BASE}/api/settings/board?type=tasks&locationId=${loc}`);
  const getText = await getRes.text();
  if (!getText.startsWith('{')) {
    throw new Error(`Board settings GET returned non-JSON (${getRes.status}): ${getText.slice(0, 120)}`);
  }
  const get = JSON.parse(getText);
  record(
    'M9-A1',
    put.ok && get.stages[0].label === 'Alpha',
    `locationId=${loc} isolated save/reload`
  );
  await fetch(`${BASE}/api/settings/board?type=tasks&locationId=${loc}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stages: [
        { id: 'todo', label: 'To Do', color: 'bg-blue-500' },
        { id: 'in_progress', label: 'In Progress', color: 'bg-orange-500' },
        { id: 'in_review', label: 'In Review', color: 'bg-purple-500' },
        { id: 'blocked', label: 'Blocked', color: 'bg-red-500' },
        { id: 'completed', label: 'Completed', color: 'bg-green-500' },
        { id: 'archived', label: 'Archived', color: 'bg-gray-400' },
      ],
    }),
  }).catch(() => {});

  // M9-A2 invalid type
  const bad = await fetch(`${BASE}/api/settings/board?type=invalid`).then((r) => r.status);
  record('M9-A2', bad === 400, `Invalid type returns 400 (got ${bad})`);
}

async function runApiErrorUiTest(page: puppeteer.Page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    if (req.url().includes('/api/settings/board') && req.method() === 'PUT') {
      req.respond({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Simulated server error' }),
      });
    } else {
      req.continue();
    }
  });

  await openTaskSettings(page);
  await setReactInput(page, '[draggable=true] input', 'API Error Test');
  await clickSave(page);
  await new Promise((r) => setTimeout(r, 1000));
  const stillOpen = await page.evaluate(() =>
    document.body.textContent?.includes('Board Columns') ?? false
  );
  record(
    'M9-T5',
    stillOpen,
    `API 500 on save keeps modal open (user can retry): modalOpen=${stillOpen}`
  );

  await page.setRequestInterception(false);
}

async function main() {
  console.log('=== Module 9 Extended Browser/API Tests ===\n');

  await waitForServer();
  await runApiExtraTests();

  const browser = await launchTestBrowser();
  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    await runOrdersBoardTests(page);
    await runTaskExtraTests(page);
    await runApiErrorUiTest(page);
  } finally {
    await browser.close();
  }

  // Restore defaults
  await fetch(`${BASE}/api/settings/board?type=tasks`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stages: [
        { id: 'todo', label: 'To Do', color: 'bg-blue-500' },
        { id: 'in_progress', label: 'In Progress', color: 'bg-orange-500' },
        { id: 'in_review', label: 'In Review', color: 'bg-purple-500' },
        { id: 'blocked', label: 'Blocked', color: 'bg-red-500' },
        { id: 'completed', label: 'Completed', color: 'bg-green-500' },
        { id: 'archived', label: 'Archived', color: 'bg-gray-400' },
      ],
    }),
  });
  await fetch(`${BASE}/api/settings/board?type=orders`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      stages: [
        { id: 'incoming', label: 'Incoming', color: 'bg-yellow-500' },
        { id: 'preparing', label: 'Preparing', color: 'bg-orange-500' },
        { id: 'served', label: 'Served', color: 'bg-indigo-500' },
        { id: 'ready', label: 'Ready for Pickup', color: 'bg-green-500' },
        { id: 'completed', label: 'Completed', color: 'bg-purple-500' },
        { id: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
      ],
    }),
  });

  const failed = results.filter((r) => !r.pass);
  console.log('\n=== Summary ===');
  console.log(`Passed: ${results.length - failed.length}/${results.length}`);
  if (failed.length) {
    failed.forEach((f) => console.log(`  FAIL ${f.id}: ${f.detail}`));
    process.exit(1);
  }
  console.log('🎉 All extended Module 9 tests passed.');
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
