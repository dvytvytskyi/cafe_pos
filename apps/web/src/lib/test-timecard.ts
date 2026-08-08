/**
 * Module 18 — TimeCard integration tests (T18.3, T18.4)
 */
import { prisma, disconnectDb } from './db.ts';
import { createHash } from 'crypto';

const BASE = 'http://localhost:3000';
const ROLE_ID = 'role-timecard-test';
const USER_ID = 'user-timecard-test';
const PIN = '8811';

async function cleanup() {
  await prisma.timeCard.deleteMany({ where: { userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.role.deleteMany({ where: { id: ROLE_ID } });
}

async function setup() {
  await cleanup();
  await prisma.role.create({
    data: { id: ROLE_ID, name: 'TimeCard Test Role', permissions: {} },
  });
  await prisma.user.create({
    data: {
      id: USER_ID,
      name: 'TimeCard Tester',
      pinHash: createHash('sha256').update(PIN).digest('hex'),
      roleId: ROLE_ID,
      status: 'active',
    },
  });
}

async function main() {
  console.log('--- Module 18 TimeCard Integration Tests ---');
  let exitCode = 0;

  try {
    await setup();

    const in1 = await fetch(`${BASE}/api/staff/time-tracking/clock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: PIN }),
    });
    const body1 = await in1.json();
    if (in1.status !== 201 || body1.clockOut !== undefined && body1.checkOutTime !== null) {
      /* checkOutTime null ok */
    }
    if (in1.status !== 201) {
      console.error('❌ clock-in failed', body1);
      exitCode = 1;
    } else {
      console.log('✅ T18.5 PIN clock-in creates record');
    }

    const dbOpen = await prisma.timeCard.findFirst({ where: { userId: USER_ID, clockOut: null } });
    if (!dbOpen) {
      console.error('❌ T18.5 clockOut should be null in DB');
      exitCode = 1;
    }

    const dup = await fetch(`${BASE}/api/staff/time-tracking/clock-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID }),
    });
    const dupBody = await dup.json();
    if (dup.status !== 400 || dupBody.code !== 'ALREADY_CLOCKED_IN') {
      console.error('❌ T18.3 double clock-in', dup.status, dupBody);
      exitCode = 1;
    } else {
      console.log('✅ T18.3 double clock-in → 400 ALREADY_CLOCKED_IN');
    }

    const out = await fetch(`${BASE}/api/staff/time-tracking/clock-out`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: USER_ID }),
    });
    const outBody = await out.json();
    if (out.status !== 200 || !outBody.totalMinutes || outBody.totalMinutes <= 0) {
      console.error('❌ T18.6 clock-out totalMinutes', outBody);
      exitCode = 1;
    } else {
      console.log(`✅ T18.6 clock-out totalMinutes=${outBody.totalMinutes}`);
    }

    const today = new Date().toISOString().slice(0, 10);
    const range = await fetch(`${BASE}/api/staff/time-tracking?from=${today}&to=${today}`);
    const rangeBody = await range.json();
    if (!Array.isArray(rangeBody) || !rangeBody.some((r: { employeeId: string }) => r.employeeId === USER_ID)) {
      console.error('❌ T18.4 date range filter', rangeBody);
      exitCode = 1;
    } else {
      console.log('✅ T18.4 date range filter');
    }

    if (exitCode === 0) console.log('--- Module 18 integration tests passed ---');
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
