/**
 * Module 19 — Schedule integration tests (T19.3)
 */
import { prisma, disconnectDb } from './db.ts';
import { createHash } from 'crypto';

const BASE = 'http://localhost:3000';
const ROLE_ID = 'role-schedule-test';
const USER_ID = 'user-schedule-test';
const WEEK = '2026-08-03';

async function cleanup() {
  await prisma.shiftSchedule.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.role.deleteMany({ where: { id: ROLE_ID } });
}

async function setup() {
  await cleanup();
  await prisma.role.create({
    data: { id: ROLE_ID, name: 'Schedule Test Role', permissions: {} },
  });
  await prisma.user.create({
    data: {
      id: USER_ID,
      name: 'Schedule Tester',
      pinHash: createHash('sha256').update('9900').digest('hex'),
      roleId: ROLE_ID,
      status: 'active',
    },
  });
}

async function main() {
  console.log('--- Module 19 Schedule Integration Tests ---');
  let exitCode = 0;

  try {
    await setup();

    const ok = await fetch(`${BASE}/api/staff/schedule/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: WEEK,
        shifts: [{ userId: USER_ID, dayOfWeek: 0, startTime: '09:00', endTime: '17:00' }],
      }),
    });
    if (ok.status !== 200) {
      console.error('❌ initial bulk save failed', await ok.json());
      exitCode = 1;
    }

    const overlap = await fetch(`${BASE}/api/staff/schedule/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: WEEK,
        shifts: [
          { userId: USER_ID, dayOfWeek: 1, startTime: '09:00', endTime: '13:00' },
          { userId: USER_ID, dayOfWeek: 1, startTime: '12:00', endTime: '16:00' },
        ],
      }),
    });
    if (overlap.status !== 400) {
      console.error('❌ overlap should 400', await overlap.json());
      exitCode = 1;
    } else {
      console.log('✅ T19.2 integration overlapping bulk rejected');
    }

    const countBefore = await prisma.shiftSchedule.count({ where: { userId: USER_ID, weekStart: new Date(`${WEEK}T00:00:00.000Z`) } });
    const badFk = await fetch(`${BASE}/api/staff/schedule/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weekStart: WEEK,
        shifts: [
          { userId: USER_ID, dayOfWeek: 2, startTime: '10:00', endTime: '14:00' },
          { userId: 'non-existent-user-id', dayOfWeek: 3, startTime: '10:00', endTime: '14:00' },
        ],
      }),
    });
    if (badFk.status === 200) {
      console.error('❌ T19.3 expected failure for invalid user');
      exitCode = 1;
    }
    const countAfter = await prisma.shiftSchedule.count({ where: { userId: USER_ID, weekStart: new Date(`${WEEK}T00:00:00.000Z`) } });
    if (countBefore !== countAfter) {
      console.error('❌ T19.3 rollback failed', countBefore, countAfter);
      exitCode = 1;
    } else {
      console.log('✅ T19.3 bulk save transaction rollback');
    }

    const get = await fetch(`${BASE}/api/staff/schedule?weekStart=${WEEK}`);
    const getBody = await get.json();
    if (get.status !== 200 || getBody.weekStart !== WEEK) {
      console.error('❌ T19.5 GET weekStart', getBody);
      exitCode = 1;
    } else {
      console.log('✅ T19.5 GET schedule by weekStart');
    }

    if (exitCode === 0) console.log('--- Module 19 integration tests passed ---');
  } catch (err) {
    exitCode = 1;
    console.error(err);
  } finally {
    await cleanup();
    await disconnectDb();
    process.exit(exitCode);
  }
}

main();
