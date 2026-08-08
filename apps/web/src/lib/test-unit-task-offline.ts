import assert from 'assert';
import { formatDeadlineLabel, mapDbTaskToRecord } from './task-mapper.ts';

export async function run() {
  console.log('Running test-unit-task-offline...');

  const sampleTask = {
    id: 'T-OFFLINE-1',
    title: 'Offline queued task',
    branch: 'Gothic',
    tags: [{ label: 'IT', bg: 'bg-gray-100', text: 'text-gray-600' }],
    commentsCount: 0,
    attachmentsCount: 0,
    progress: 0,
    dueAt: null,
    scheduledDate: new Date('2026-08-05'),
    assigneeIds: ['user-1'],
    status: 'todo',
    locationId: null,
    createdAt: new Date('2026-08-05T10:00:00Z'),
    updatedAt: new Date('2026-08-05T10:00:00Z'),
  };

  const mapped = mapDbTaskToRecord(sampleTask);
  assert.strictEqual(mapped.id, 'T-OFFLINE-1');
  assert.strictEqual(mapped.assignees[0], 'user-1');
  assert.strictEqual(mapped.scheduledDate, '2026-08-05');
  assert.strictEqual(mapped.deadline, 'No deadline');

  // Offline queue record must be JSON-serializable for IndexedDB put()
  const serialized = JSON.parse(JSON.stringify(mapped));
  assert.strictEqual(serialized.title, 'Offline queued task');
  assert.ok(Array.isArray(serialized.assignees));

  assert.strictEqual(formatDeadlineLabel(new Date(Date.now() - 1000), 'in_progress', 0), 'Overdue');
  assert.strictEqual(formatDeadlineLabel(null, 'completed', 100), 'Done');

  console.log('✅ test-unit-task-offline passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
