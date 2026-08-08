import assert from 'assert';
import { prisma, disconnectDb } from './db.ts';
import {
  checklistRepository,
  ShiftClosedError,
  ChecklistForbiddenError,
} from '../repositories/checklist.repository.ts';
import { shiftRepository } from '../repositories/shift.repository.ts';
import { formatDateParam } from './task-dates.ts';

const ROLE_ID = 'role-checklist-m10';
const USER_ID = 'user-checklist-m10';
const LOCATION_ID = 'default';
const TODAY = formatDateParam(new Date());
const YESTERDAY = formatDateParam(new Date(Date.now() - 86400000));

async function setupStaff() {
  await prisma.location.upsert({
    where: { id: LOCATION_ID },
    update: {},
    create: { id: LOCATION_ID, name: 'Default Cafe', address: 'Main St 1' },
  });
  await prisma.role.upsert({
    where: { id: ROLE_ID },
    update: {},
    create: { id: ROLE_ID, name: 'Checklist M10', permissions: {} },
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { status: 'active' },
    create: {
      id: USER_ID,
      name: 'Checklist Tester',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'active',
    },
  });
}

async function cleanup() {
  await prisma.dailyChecklist.deleteMany({
    where: { taskKey: { startsWith: 'test_' } },
  });
  await prisma.cashShift.deleteMany({ where: { locationId: LOCATION_ID, userId: USER_ID } });
  await prisma.user.deleteMany({ where: { id: USER_ID } }).catch(() => {});
  await prisma.role.deleteMany({ where: { id: ROLE_ID } }).catch(() => {});
}

export async function run() {
  console.log('--- Module 10 DailyChecklists Integration Tests ---');

  try {
    await cleanup();
    await setupStaff();
    await checklistRepository.ensureDefaultTemplates();

    // Open cash shift for today's completions
    await shiftRepository.openShift(LOCATION_ID, USER_ID, 100);

    // T10.3 — unique per shift+date+taskKey
    const first = await checklistRepository.upsertCompletion({
      shiftType: 'opening',
      date: TODAY,
      locationKey: 'gotico',
      taskKey: 'test_unique',
      completed: true,
      userId: USER_ID,
    });
    const second = await checklistRepository.upsertCompletion({
      shiftType: 'opening',
      date: TODAY,
      locationKey: 'gotico',
      taskKey: 'test_unique',
      completed: true,
      userId: USER_ID,
    });
    assert.strictEqual(first.id, second.id);
    const count = await prisma.dailyChecklist.count({
      where: {
        shiftType: 'opening',
        scheduledDate: new Date(TODAY),
        locationKey: 'gotico',
        taskKey: 'test_unique',
      },
    });
    assert.strictEqual(count, 1);
    console.log('✅ T10.3 Unique per shift+date+taskKey');

    // T10.4 — PATCH completion persisted
    const patched = await checklistRepository.patchCompletion(first.id, {
      completed: false,
      userId: USER_ID,
    });
    assert.strictEqual(patched.completed, false);
    assert.strictEqual(patched.completedAt, null);
    const reloaded = await prisma.dailyChecklist.findUnique({ where: { id: first.id } });
    assert.strictEqual(reloaded?.completed, false);
    console.log('✅ T10.4 PATCH completion persisted');

    // T10.2 integration — block when shift closed
    const openShift = await shiftRepository.findActiveShift(LOCATION_ID);
    assert.ok(openShift);
    await shiftRepository.closeShift(openShift!.id, 100);

    let shiftClosed = false;
    try {
      await checklistRepository.upsertCompletion({
        shiftType: 'opening',
        date: TODAY,
        locationKey: 'gotico',
        taskKey: 'test_shift_closed',
        completed: true,
        userId: USER_ID,
      });
    } catch (err) {
      shiftClosed = err instanceof ShiftClosedError;
    }
    assert.ok(shiftClosed, 'Expected ShiftClosedError when cash shift closed');
    console.log('✅ T10.2 Block check if shift closed');

    // Re-open shift for T10.6 test isn't needed - past date test
    let pastForbidden = false;
    try {
      await checklistRepository.upsertCompletion({
        shiftType: 'opening',
        date: YESTERDAY,
        locationKey: 'gotico',
        taskKey: 'test_past',
        completed: true,
        userId: USER_ID,
      });
    } catch (err) {
      pastForbidden = err instanceof ChecklistForbiddenError;
    }
    assert.ok(pastForbidden, 'Expected ChecklistForbiddenError for yesterday');
    console.log('✅ T10.6 Waiter edits yesterday checklist → 403 (repository)');

    console.log('✅ Module 10 integration tests passed.');
  } finally {
    await cleanup();
    await disconnectDb();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
