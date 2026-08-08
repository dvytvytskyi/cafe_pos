/**
 * Module 11 — browser scenarios T11.5, T11.6
 * Run: node --experimental-strip-types src/lib/test-upload-browser.ts
 */
import puppeteer from 'puppeteer-core';
import path from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { prisma, disconnectDb } from './db.ts';
import { checklistRepository } from '../repositories/checklist.repository.ts';
import { shiftRepository } from '../repositories/shift.repository.ts';
import { formatDateParam } from './task-dates.ts';
import { gotoPage, launchTestBrowser, waitForLoadingGone } from './browser-test-utils.ts';

const BASE = 'http://localhost:3000';
const SAMPLE_PNG = path.join(process.cwd(), 'public/media/test-sample.png');

const MIN_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

const ROLE_ID = 'role-upload-browser';
const USER_ID = 'user-upload-browser';
const LOCATION_ID = 'default';
const TODAY = formatDateParam(new Date());
const PHOTO_TASK_KEY = 'c1';

type Result = { id: string; pass: boolean; detail: string };
const results: Result[] = [];

function record(id: string, pass: boolean, detail: string) {
  results.push({ id, pass, detail });
  console.log(`${pass ? '✅' : '❌'} ${id}: ${detail}`);
}

async function setupDb() {
  await mkdir(path.dirname(SAMPLE_PNG), { recursive: true });
  await writeFile(SAMPLE_PNG, MIN_PNG);
  await prisma.location.upsert({
    where: { id: LOCATION_ID },
    update: {},
    create: { id: LOCATION_ID, name: 'Default Cafe', address: 'Main St 1' },
  });
  await prisma.role.upsert({
    where: { id: ROLE_ID },
    update: {},
    create: { id: ROLE_ID, name: 'Upload Browser', permissions: {} },
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { status: 'active' },
    create: {
      id: USER_ID,
      name: 'Upload Browser User',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'active',
    },
  });
  await checklistRepository.ensureDefaultTemplates();
  await prisma.dailyChecklist.deleteMany({
    where: { taskKey: PHOTO_TASK_KEY, locationKey: 'gotico', scheduledDate: new Date(TODAY) },
  });
  if (!(await shiftRepository.findActiveShift(LOCATION_ID))) {
    await shiftRepository.openShift(LOCATION_ID, USER_ID, 100);
  }
}

async function cleanupDb() {
  await prisma.dailyChecklist.deleteMany({
    where: { taskKey: PHOTO_TASK_KEY, locationKey: 'gotico' },
  });
  await prisma.cashShift.deleteMany({ where: { userId: USER_ID } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: USER_ID } }).catch(() => {});
  await prisma.role.deleteMany({ where: { id: ROLE_ID } }).catch(() => {});
}

async function openClosingChecklist(page: puppeteer.Page) {
  await gotoPage(page, '/operations?tab=checklists', '[data-testid="checklist-date-nav"]');
  await waitForLoadingGone(page, 'Loading checklists');

  await page.evaluate(() => {
    [...document.querySelectorAll('button')].find((b) =>
      b.textContent?.includes('Evening Closing')
    )?.click();
  });

  await waitForLoadingGone(page, 'Loading checklists');
}

async function openPhotoModal(page: puppeteer.Page) {
  await page.click(`[data-testid="checklist-task-gotico-${PHOTO_TASK_KEY}"]`);
  await page.waitForSelector('[data-testid="photo-proof-modal"]', { timeout: 10000 });
}

async function uploadSamplePhoto(page: puppeteer.Page) {
  const input = await page.waitForSelector('[data-testid="photo-upload-input"]', { timeout: 10000 });
  await input!.uploadFile(SAMPLE_PNG);
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="photo-upload-input"]') as HTMLInputElement | null;
    el?.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

async function run() {
  console.log('--- Module 11 PhotoProofUpload Browser Tests ---');

  let browser: puppeteer.Browser | null = null;

  try {
    await setupDb();

    browser = await launchTestBrowser();
    const page = await browser.newPage();

    let uploadStatus = 0;
    page.on('response', (res) => {
      if (res.url().includes('/api/upload') && res.request().method() === 'POST') {
        uploadStatus = res.status();
      }
    });

    await openClosingChecklist(page);
    await openPhotoModal(page);

    // T11.5 — upload image → thumbnail on card
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/upload') && res.request().method() === 'POST',
        { timeout: 20000 }
      ),
      uploadSamplePhoto(page),
    ]);
    await page.waitForSelector('[data-testid="checklist-thumb-gotico-c1"]', { timeout: 20000 });

    const thumbSrc = await page.$eval(
      '[data-testid="checklist-thumb-gotico-c1"]',
      (el) => (el as HTMLImageElement).src
    );
    const dbRow = await prisma.dailyChecklist.findFirst({
      where: {
        taskKey: PHOTO_TASK_KEY,
        locationKey: 'gotico',
        scheduledDate: new Date(TODAY),
        shiftType: 'closing',
        completed: true,
      },
    });

    record(
      'T11.5',
      uploadStatus === 201 &&
        thumbSrc.includes('/uploads/') &&
        !!dbRow?.photoUrl?.startsWith('/uploads/'),
      `upload=${uploadStatus} thumb=${thumbSrc.includes('/uploads/')} db=${!!dbRow?.photoUrl}`
    );

    // Reset for T11.6 — open another photo task without completing
    await prisma.dailyChecklist.deleteMany({
      where: { taskKey: 'c2', locationKey: 'gotico', scheduledDate: new Date(TODAY) },
    });
    uploadStatus = 0;
    await page.click(`[data-testid="checklist-task-gotico-c2"]`);
    await page.waitForSelector('[data-testid="photo-upload-input"]', { timeout: 10000 });

    const input2 = await page.$('[data-testid="photo-upload-input"]');
    // Use a .txt file disguised attempt — create temp txt in uploads folder for test
    const txtPath = path.join(process.cwd(), 'public/uploads/test-invalid.txt');
    const fs = await import('fs/promises');
    await fs.writeFile(txtPath, 'not an image');
    await input2!.uploadFile(txtPath);
    await page.evaluate(() => {
      const el = document.querySelector('[data-testid="photo-upload-input"]') as HTMLInputElement | null;
      el?.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForSelector('[data-testid="photo-upload-error"]', { timeout: 10000 });

    const errorText = await page.$eval(
      '[data-testid="photo-upload-error"]',
      (el) => el.textContent?.trim() ?? ''
    );
    const invalidDb = await prisma.dailyChecklist.count({
      where: { taskKey: 'c2', locationKey: 'gotico', completed: true },
    });

    record(
      'T11.6',
      uploadStatus === 400 && /JPEG|PNG/i.test(errorText) && invalidDb === 0,
      `upload=${uploadStatus} error=${errorText} dbCompleted=${invalidDb}`
    );

    await fs.unlink(txtPath).catch(() => {});

    const failed = results.filter((r) => !r.pass);
    if (failed.length) {
      console.error('\nFailed:', failed);
      process.exitCode = 1;
    } else {
      console.log('\n✅ Module 11 browser tests passed.');
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
