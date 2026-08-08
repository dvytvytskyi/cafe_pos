/**
 * Module 24 — Profile browser test (T24.4 name in header after reload)
 */
import puppeteer, { type Page } from 'puppeteer-core';
import { createHash } from 'crypto';
import { prisma } from './db.ts';
import { DEFAULT_PROFILE_USER_ID } from './current-user.ts';
import { gotoPage, launchTestBrowser, reloadPage, setReactInput } from './browser-test-utils.ts';

const TEST_NAME = 'Browser TestName';

async function cleanup(originalName: string) {
  await prisma.user.update({
    where: { id: DEFAULT_PROFILE_USER_ID },
    data: { name: originalName },
  }).catch(() => {});
}

async function main() {
  console.log('--- Module 24 Profile Browser Tests ---');

  await prisma.role.upsert({
    where: { id: 'role-default-waiter' },
    update: {},
    create: {
      id: 'role-default-waiter',
      name: 'Waiter',
      permissions: {},
    },
  });
  await prisma.user.upsert({
    where: { id: DEFAULT_PROFILE_USER_ID },
    update: { status: 'active', name: 'Anna Muñoz Hidalgo', email: 'anna@corgicafe.local' },
    create: {
      id: DEFAULT_PROFILE_USER_ID,
      name: 'Anna Muñoz Hidalgo',
      email: 'anna@corgicafe.local',
      pinHash: createHash('sha256').update('1234').digest('hex'),
      roleId: 'role-default-waiter',
      status: 'active',
    },
  });

  const user = await prisma.user.findUnique({ where: { id: DEFAULT_PROFILE_USER_ID } });
  if (!user) {
    console.error('❌ Default profile user not found');
    process.exit(1);
  }
  const originalName = user.name;

  const browser = await launchTestBrowser();

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 900 });

  try {
    await gotoPage(page, '/settings');
    await page.evaluate(() => localStorage.setItem('corgi_active_menu', 'profile'));
    await reloadPage(page, '[data-testid="profile-first-name"]');

    await setReactInput(page, '[data-testid="profile-first-name"]', 'Browser');
    await setReactInput(page, '[data-testid="profile-last-name"]', 'TestName');

    await page.waitForSelector('[data-testid="profile-save-bar"][data-visible="true"]', { timeout: 10000 });

    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/api/profile') && res.request().method() === 'PUT',
        { timeout: 30000 }
      ),
      page.click('[data-testid="profile-save-btn"]'),
    ]);

    await reloadPage(page, '[data-testid="profile-display-name"]');

    const nameInForm = await page.$eval(
      '[data-testid="profile-display-name"]',
      (el) => el.textContent?.trim() ?? ''
    );
    if (!nameInForm.includes('TestName')) {
      throw new Error(`Profile form name mismatch: ${nameInForm}`);
    }

    const nameInHeader = await page.$eval(
      '[data-testid="header-profile-name"]',
      (el) => el.textContent?.trim() ?? ''
    );
    if (!nameInHeader.includes('TestName')) {
      throw new Error(`Header name mismatch after reload: ${nameInHeader}`);
    }

    const dbUser = await prisma.user.findUnique({ where: { id: DEFAULT_PROFILE_USER_ID } });
    if (dbUser?.name !== TEST_NAME) {
      throw new Error(`DB name mismatch: ${dbUser?.name}`);
    }

    console.log('✅ T24.4 name persists in profile + header after reload');
  } finally {
    await browser.close();
    await cleanup(originalName);
  }

  console.log('--- Module 24 Profile Browser Tests Passed ---');
}

main().catch(async (err) => {
  console.error('❌ Profile browser test failed:', err);
  process.exit(1);
});
