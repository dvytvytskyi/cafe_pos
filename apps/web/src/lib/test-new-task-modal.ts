import assert from 'assert';
import {
  taskRepository,
  InactiveAssigneeError,
} from '../repositories/task.repository.ts';
import { validateTaskTitle } from './task-validation.ts';
import { formatDateParam } from './task-dates.ts';
import { prisma } from './db.ts';

const ROLE_ID = 'role-newtask-int';
const ACTIVE_ID = 'user-newtask-active';
const INACTIVE_ID = 'user-newtask-inactive';
const TODAY = formatDateParam(new Date());

async function setupStaff() {
  await prisma.role.upsert({
    where: { id: ROLE_ID },
    update: {},
    create: { id: ROLE_ID, name: 'NewTask Integration', permissions: {} },
  });
  await prisma.user.upsert({
    where: { id: ACTIVE_ID },
    update: { status: 'active' },
    create: {
      id: ACTIVE_ID,
      name: 'Active NewTask User',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'active',
    },
  });
  await prisma.user.upsert({
    where: { id: INACTIVE_ID },
    update: { status: 'inactive' },
    create: {
      id: INACTIVE_ID,
      name: 'Inactive NewTask User',
      pinHash: 'dummy',
      roleId: ROLE_ID,
      status: 'inactive',
    },
  });
}

async function cleanup(ids: string[]) {
  await prisma.task.deleteMany({ where: { id: { in: ids } } }).catch(() => {});
  await prisma.user.deleteMany({ where: { id: { in: [ACTIVE_ID, INACTIVE_ID] } } }).catch(() => {});
  await prisma.role.delete({ where: { id: ROLE_ID } }).catch(() => {});
}

export async function run() {
  console.log('--- Module 8 NewTaskModal Integration Tests ---');
  const createdIds: string[] = [];

  try {
    await setupStaff();
    const ts = Date.now().toString().slice(-6);

    // T8.3 — valid payload creates task
    const taskId = `T-M8-${ts}`;
    createdIds.push(taskId);
    const created = await taskRepository.create({
      id: taskId,
      title: 'Valid New Task M8',
      status: 'todo',
      assignees: [ACTIVE_ID],
      scheduledDate: TODAY,
      branch: 'Gothic',
      description: 'Optional details',
    });
    assert.strictEqual(created.id, taskId);
    assert.strictEqual(created.title, 'Valid New Task M8');
    console.log('✅ T8.3 Create task valid payload');

    // T8.4 — empty description allowed
    const taskId2 = `T-M8D-${ts}`;
    createdIds.push(taskId2);
    const created2 = await taskRepository.create({
      id: taskId2,
      title: 'No Description Task',
      status: 'todo',
      assignees: [ACTIVE_ID],
      scheduledDate: TODAY,
      description: '',
    });
    assert.strictEqual(created2.title, 'No Description Task');
    assert.ok(created2.description === null || created2.description === '');
    console.log('✅ T8.4 Empty description allowed');

    // T8.1 — title validation blocks short titles (API contract)
    assert.strictEqual(validateTaskTitle('ab').valid, false);
    console.log('✅ T8.1 Short title rejected by validation');

    // T8.2 — inactive assignee blocked
    let inactiveRejected = false;
    try {
      await taskRepository.create({
        title: 'Inactive assignee task',
        status: 'todo',
        assignees: [INACTIVE_ID],
        scheduledDate: TODAY,
      });
    } catch (err) {
      inactiveRejected = err instanceof InactiveAssigneeError;
    }
    assert.strictEqual(inactiveRejected, true);
    console.log('✅ T8.2 Inactive staff assignment blocked');

    console.log('--- Module 8 NewTaskModal Integration Tests PASSED ---');
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
