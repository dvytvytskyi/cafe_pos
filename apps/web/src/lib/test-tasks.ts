import assert from 'assert';
import { taskRepository, InvalidAssigneeError } from '../repositories/task.repository.ts';
import { isValidDateParam, formatDateParam } from './task-dates.ts';
import { prisma } from './db.ts';

const ROLE_ID = 'role-tasks-int';
const USER_ID = 'user-tasks-int';
const TODAY = formatDateParam(new Date());

async function setupStaff() {
  await prisma.role.upsert({
    where: { id: ROLE_ID },
    update: {},
    create: { id: ROLE_ID, name: 'Task Integration', permissions: {} },
  });
  await prisma.user.upsert({
    where: { id: USER_ID },
    update: { status: 'active' },
    create: {
      id: USER_ID,
      name: 'Task Integration User',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'active',
    },
  });
}

async function cleanup(ids: string[]) {
  await prisma.task.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
  await prisma.user.delete({ where: { id: USER_ID } }).catch(() => {});
  await prisma.role.delete({ where: { id: ROLE_ID } }).catch(() => {});
}

export async function run() {
  console.log('--- Module 7 Task Integration Tests ---');
  const createdIds: string[] = [];

  try {
    await setupStaff();

    assert.strictEqual(isValidDateParam('not-a-date'), false);
    console.log('✅ T7.1 Invalid date rejected');

    const ts = Date.now().toString().slice(-6);
    const taskId = `T-INT-${ts}`;
    createdIds.push(taskId);

    const created = await taskRepository.create({
      id: taskId,
      title: `Integration Task ${ts}`,
      status: 'todo',
      assignees: [USER_ID],
      scheduledDate: TODAY,
      branch: 'Gothic',
    });
    assert.strictEqual(created.id, taskId);
    assert.ok(created.assignees.includes(USER_ID));
    console.log('✅ T7.3 Create task with valid assigneeId');

    let invalidRejected = false;
    try {
      await taskRepository.create({
        title: 'Bad assignee',
        status: 'todo',
        assignees: ['missing-user-xyz'],
        scheduledDate: TODAY,
      });
    } catch (err) {
      invalidRejected = err instanceof InvalidAssigneeError;
    }
    assert.strictEqual(invalidRejected, true);
    console.log('✅ T7.4 Invalid assigneeId → rollback');

    const byDate = await taskRepository.findAll({ date: TODAY });
    assert.ok(byDate.some((t) => t.id === taskId));
    console.log('✅ T7.5 Filter by date');

    const byUser = await taskRepository.findAll({ date: TODAY, assigneeId: USER_ID });
    assert.ok(byUser.every((t) => t.assignees.includes(USER_ID)));
    assert.ok(byUser.some((t) => t.id === taskId));
    console.log('✅ T7.6 Filter by assignee');

    const syncId = `T-SYNC-${ts}`;
    createdIds.push(syncId);
    const synced = await taskRepository.syncFromClient({
      id: syncId,
      title: 'Offline synced task',
      status: 'todo',
      assignees: [USER_ID],
      scheduledDate: TODAY,
      branch: 'HQ',
      updatedAt: new Date().toISOString(),
    });
    assert.strictEqual(synced.id, syncId);

    const found = await taskRepository.findAll({ date: TODAY });
    assert.ok(found.some((t) => t.id === syncId));
    console.log('✅ T7.7 Offline sync merge');

    console.log('--- Module 7 Task Integration Tests PASSED ---');
  } finally {
    await cleanup(createdIds);
    await prisma.$disconnect();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
