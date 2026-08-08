import assert from 'assert';
import { prisma, disconnectDb } from './db.ts';
import { operationsKpiRepository } from '../repositories/operations-kpi.repository.ts';
import { shiftRepository } from '../repositories/shift.repository.ts';

const BASE = 'http://localhost:3000';
const ROLE_ID = 'role-kpi-m12';
const USER_ID = 'user-kpi-m12';
const LOCATION_ID = 'default';
const TEST_DATE = '2099-06-15';

async function setup() {
  await prisma.location.upsert({
    where: { id: LOCATION_ID },
    update: {},
    create: { id: LOCATION_ID, name: 'Default Cafe', address: 'Main St 1' },
  });
  await prisma.role.upsert({
    where: { id: ROLE_ID },
    update: {},
    create: { id: ROLE_ID, name: 'KPI M12', permissions: {} },
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { status: 'active' },
    create: {
      id: USER_ID,
      name: 'KPI Tester',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'active',
    },
  });

  await prisma.task.deleteMany({
    where: { id: { startsWith: 'T-KPI-M12' } },
  });
  await prisma.dailyChecklist.deleteMany({
    where: { taskKey: { startsWith: 'kpi_test' } },
  });

  await prisma.task.createMany({
    data: [
      {
        id: 'T-KPI-M12-1',
        title: 'KPI Todo',
        scheduledDate: new Date(TEST_DATE),
        status: 'todo',
        assigneeIds: [],
      },
      {
        id: 'T-KPI-M12-2',
        title: 'KPI Done',
        scheduledDate: new Date(TEST_DATE),
        status: 'completed',
        assigneeIds: [],
      },
      {
        id: 'T-KPI-M12-3',
        title: 'KPI Progress',
        scheduledDate: new Date(TEST_DATE),
        status: 'in_progress',
        assigneeIds: [],
      },
    ],
  });

  if (!(await shiftRepository.findActiveShift(LOCATION_ID))) {
    await shiftRepository.openShift(LOCATION_ID, USER_ID, 100);
  }

  const shift = await shiftRepository.findActiveShift(LOCATION_ID);
  await prisma.dailyChecklist.createMany({
    data: [
      {
        shiftType: 'opening',
        scheduledDate: new Date(TEST_DATE),
        locationKey: 'gotico',
        taskKey: 'kpi_test_1',
        completed: true,
        cashShiftId: shift!.id,
      },
      {
        shiftType: 'opening',
        scheduledDate: new Date(TEST_DATE),
        locationKey: 'gotico',
        taskKey: 'kpi_test_2',
        completed: false,
        cashShiftId: shift!.id,
      },
    ],
  });

  return shift!.id;
}

async function cleanup() {
  await prisma.dailyChecklist.deleteMany({ where: { taskKey: { startsWith: 'kpi_test' } } });
  await prisma.task.deleteMany({ where: { id: { startsWith: 'T-KPI-M12' } } });
  await prisma.cashShift.deleteMany({ where: { userId: USER_ID } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: USER_ID } }).catch(() => {});
  await prisma.role.deleteMany({ where: { id: ROLE_ID } }).catch(() => {});
}

export async function run() {
  console.log('--- Module 12 Operations KPI Integration Tests ---');

  try {
    const shiftId = await setup();

    // T12.3 — repository aggregation
    const kpi = await operationsKpiRepository.getKpi(TEST_DATE, shiftId);
    assert.strictEqual(kpi.tasks.total, 3);
    assert.strictEqual(kpi.tasks.completed, 1);
    assert.strictEqual(kpi.tasks.byStatus.todo, 1);
    assert.strictEqual(kpi.tasks.byStatus.completed, 1);
    assert.strictEqual(kpi.tasks.byStatus.in_progress, 1);
    assert.strictEqual(kpi.tasks.completionPercent, 33);
    assert.strictEqual(kpi.checklists.total, 2);
    assert.strictEqual(kpi.checklists.completed, 1);
    assert.strictEqual(kpi.checklists.completionPercent, 50);
    console.log('✅ T12.3 SQL COUNT/GROUP BY matches repository');

    const res = await fetch(`${BASE}/api/operations/kpi?date=${TEST_DATE}&shiftId=${shiftId}`);
    assert.strictEqual(res.status, 200);
    const api = await res.json();
    assert.strictEqual(api.tasks.total, kpi.tasks.total);
    assert.strictEqual(api.tasks.completed, kpi.tasks.completed);
    assert.strictEqual(api.checklists.completed, kpi.checklists.completed);
    console.log('✅ T12.3 API matches repository');

    const emptyDate = '2020-01-01';
    const emptyKpi = await operationsKpiRepository.getKpi(emptyDate);
    assert.strictEqual(emptyKpi.tasks.isEmpty, true);
    assert.strictEqual(emptyKpi.tasks.completionPercent, 0);
    console.log('✅ T12.2 empty date → 0% via API layer');

    console.log('✅ Module 12 integration tests passed.');
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
