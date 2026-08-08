import assert from 'assert';
import {
  validateTaskTitle,
  filterActiveEmployees,
  TASK_TITLE_MIN,
  TASK_TITLE_MAX,
} from './task-validation.ts';

export async function run() {
  console.log('Running test-unit-new-task-modal...');

  // T8.1 — title too short
  assert.strictEqual(validateTaskTitle('').valid, false);
  assert.strictEqual(validateTaskTitle('  ').valid, false);
  assert.strictEqual(validateTaskTitle('ab').valid, false);
  assert.match(validateTaskTitle('ab').error ?? '', /at least/i);

  // T8.1 — valid boundaries
  assert.strictEqual(validateTaskTitle('abc').valid, true);
  assert.strictEqual(validateTaskTitle('a'.repeat(TASK_TITLE_MAX)).valid, true);
  assert.strictEqual(validateTaskTitle('a'.repeat(TASK_TITLE_MAX + 1)).valid, false);

  assert.strictEqual(TASK_TITLE_MIN, 3);
  assert.strictEqual(TASK_TITLE_MAX, 500);

  // T8.2 — inactive staff filtered from assignee list
  const staff = [
    { id: 's1', name: 'Active', status: 'active' },
    { id: 's2', name: 'Inactive', status: 'inactive' },
    { id: 's3', name: 'No status' },
  ];
  const active = filterActiveEmployees(staff);
  assert.strictEqual(active.length, 2);
  assert.ok(active.every((e) => e.status !== 'inactive'));
  assert.ok(active.some((e) => e.id === 's1'));
  assert.ok(active.some((e) => e.id === 's3'));

  console.log('✅ test-unit-new-task-modal passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
