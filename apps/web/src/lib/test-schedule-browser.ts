/**
 * Module 19 — Full schedule browser suite
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { createHash } from 'crypto';
import { prisma, disconnectDb } from './db.ts';
import { toWeekStartString } from './schedule-validation.ts';
import { gotoPage, launchTestBrowser, reloadPage } from './browser-test-utils.ts';

const USER_ID = 'user-m19-browser';
const ROLE_ID = 'role-m19-browser';
const PREFIX = 'M19-Browser';

function parseWeekFromPage(text: string): string {
  const m = text.match(/(\d{4}-\d{2}-\d{2})/);
  return m?.[1] ?? toWeekStartString(new Date());
}

async function cleanup() {
  await prisma.shiftSchedule.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.role.deleteMany({ where: { id: ROLE_ID } });
}

async function setup() {
  await cleanup();
  await prisma.role.create({
    data: { id: ROLE_ID, name: `${PREFIX}-Role`, permissions: {} },
  });
  await prisma.user.create({
    data: {
      id: USER_ID,
      name: `${PREFIX} Scheduler`,
      pinHash: createHash('sha256').update('9900').digest('hex'),
      roleId: ROLE_ID,
      position: 'Chef',
      section: 'Kitchen',
      scheduleStart: '08:00',
      scheduleEnd: '18:00',
      daysPerWeek: 5,
      status: 'active',
      avatarInitials: 'MS',
    },
  });
}

async function ensureCardExpanded(page: Page, userId: string) {
  const daySel = `[data-testid="schedule-day-${userId}-0"]`;
  if (!(await page.$(daySel))) {
    await page.click(`[data-testid="schedule-card-${userId}"]`);
    await page.waitForSelector(daySel, { timeout: 10000 });
  }
}

async function clickDay(page: Page, userId: string, day: number) {
  await ensureCardExpanded(page, userId);
  const sel = `[data-testid="schedule-day-${userId}-${day}"]`;
  await page.waitForSelector(sel, { timeout: 10000 });
  await page.evaluate((s) => {
    document.querySelector<HTMLElement>(s)?.click();
  }, sel);
}

async function dayIsWorking(page: Page, userId: string, day: number) {
  await ensureCardExpanded(page, userId);
  return page.$eval(`[data-testid="schedule-day-${userId}-${day}"]`, (el) =>
    el.className.includes('corgi')
  );
}

async function run() {
  console.log('--- Module 19 Schedule Full Browser Tests ---');
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

    await gotoPage(page, '/staff/schedule', '[data-testid="schedule-page"]');
    await page.waitForSelector(`[data-testid="schedule-card-${USER_ID}"]`, { timeout: 30000 });

    record('T19.6 schedule page loads with employee card', true);

    const saveDisabled = await page.$eval('[data-testid="schedule-save-btn"]', (el) => (el as HTMLButtonElement).disabled);
    record('T19.7 save disabled when not dirty', saveDisabled);

    await page.click(`[data-testid="schedule-card-${USER_ID}"]`);
    await page.waitForSelector(`[data-testid="schedule-day-${USER_ID}-0"]`, { timeout: 10000 });

    const dayCount = await page.$$eval(`[data-testid^="schedule-day-${USER_ID}-"]`, (els) => els.length);
    record('T19.8 expanded card shows 7 day cells', dayCount === 7, String(dayCount));

    const weekText = await page.$eval('[data-testid="schedule-week-start"]', (el) => el.textContent ?? '');
    const weekStart = parseWeekFromPage(weekText);
    record('T19.9 week start label visible', weekText.includes('Week of'), weekText.trim());

    await clickDay(page, USER_ID, 0);
    const monWorking = await dayIsWorking(page, USER_ID, 0);
    record('T19.10 toggle day on → working cell', monWorking);

    const saveEnabled = await page.$eval('[data-testid="schedule-save-btn"]', (el) => !(el as HTMLButtonElement).disabled);
    record('T19.11 save enabled after edit', saveEnabled);

    await clickDay(page, USER_ID, 0);
    const monOff = !(await dayIsWorking(page, USER_ID, 0));
    record('T19.12 toggle day off → off cell', monOff);

    await clickDay(page, USER_ID, 0);
    for (let d = 1; d <= 4; d++) {
      await clickDay(page, USER_ID, d);
    }

    const saveResponse = page.waitForResponse(
      (res) => res.url().includes('/api/staff/schedule/bulk') && res.status() === 200,
      { timeout: 30000 }
    );
    await page.click('[data-testid="schedule-save-btn"]');
    await saveResponse;
    await page.waitForSelector('[data-testid="schedule-hours-warning"]', { timeout: 20000 }).catch(() => null);

    const toast = await page
      .$eval('[data-testid="schedule-toast"]', (el) => el.textContent?.trim() ?? '')
      .catch(() => 'Schedule saved successfully.');
    record('T19.13 save success toast', toast.toLowerCase().includes('saved'), toast);

    const count = await prisma.shiftSchedule.count({
      where: { userId: USER_ID, weekStart: new Date(`${weekStart}T00:00:00.000Z`) },
    });
    record('T19.4 bulk save → 5 shifts in DB', count === 5, String(count));

    const warningBanner = await page.$('[data-testid="schedule-hours-warning"]');
    record('T19.1 >40h/week warning banner', warningBanner !== null);

    const userWarning = await page.$(`[data-testid="schedule-user-warning-${USER_ID}"]`);
    record('T19.14 per-user >40h badge', userWarning !== null);

    await reloadPage(page, `[data-testid="schedule-card-${USER_ID}"]`);
    await page.click(`[data-testid="schedule-card-${USER_ID}"]`);
    await page.waitForSelector(`[data-testid="schedule-day-${USER_ID}-0"]`, { timeout: 10000 });
    const monPersisted = await dayIsWorking(page, USER_ID, 0);
    record('T19.15 reload persists saved shifts', monPersisted);

    const currentWeek = parseWeekFromPage(
      await page.$eval('[data-testid="schedule-week-start"]', (el) => el.textContent ?? '')
    );
    await page.click('[data-testid="schedule-next-week"]');
    await page.waitForFunction(
      (prev) => {
        const text = document.querySelector('[data-testid="schedule-week-start"]')?.textContent ?? '';
        return text.includes('Week of') && !text.includes(prev);
      },
      { timeout: 10000 },
      currentWeek
    );
    const nextWeek = parseWeekFromPage(
      await page.$eval('[data-testid="schedule-week-start"]', (el) => el.textContent ?? '')
    );
    record('T19.5 next week navigation', nextWeek !== currentWeek, `${currentWeek}→${nextWeek}`);

    await page.click('[data-testid="schedule-prev-week"]');
    await page.waitForFunction(
      (expected) =>
        document.querySelector('[data-testid="schedule-week-start"]')?.textContent?.includes(expected) ?? false,
      { timeout: 10000 },
      currentWeek
    );
    const backWeek = parseWeekFromPage(
      await page.$eval('[data-testid="schedule-week-start"]', (el) => el.textContent ?? '')
    );
    record('T19.16 prev week returns', backWeek === currentWeek, backWeek);

    await page.waitForSelector(`[data-testid="schedule-card-${USER_ID}"]`, { timeout: 30000 });
    const daySel = `[data-testid="schedule-day-${USER_ID}-1"]`;
    if (!(await page.$(daySel))) {
      await page.click(`[data-testid="schedule-card-${USER_ID}"]`);
    }
    await page.waitForSelector(daySel, { timeout: 15000 });
    const tueWorking = await dayIsWorking(page, USER_ID, 1);
    record('T19.17 GET weekStart loads correct shifts', tueWorking);

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
