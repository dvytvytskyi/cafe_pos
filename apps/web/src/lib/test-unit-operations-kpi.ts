import assert from 'assert';
import {
  calcCompletionPercent,
  buildCompletionSummary,
  countCompletedTasks,
  buildKpiPayload,
} from './operations-kpi.ts';

export async function run() {
  console.log('Running test-unit-operations-kpi...');

  // T12.1
  assert.strictEqual(calcCompletionPercent(3, 10), 30);
  assert.strictEqual(calcCompletionPercent(1, 3), 33);

  // T12.2 — zero tasks → 0%, no NaN
  assert.strictEqual(calcCompletionPercent(0, 0), 0);
  const empty = buildCompletionSummary(0, 0);
  assert.strictEqual(empty.completionPercent, 0);
  assert.strictEqual(empty.isEmpty, true);
  assert.ok(!Number.isNaN(empty.completionPercent));

  const partial = buildCompletionSummary(2, 5);
  assert.strictEqual(partial.completionPercent, 40);
  assert.strictEqual(partial.isEmpty, false);

  assert.strictEqual(countCompletedTasks({ todo: 2, completed: 3, archived: 1 }), 4);

  const payload = buildKpiPayload({
    date: '2026-08-05',
    shiftId: null,
    taskByStatus: { todo: 2, completed: 3 },
    checklistTotal: 10,
    checklistCompleted: 7,
  });
  assert.strictEqual(payload.tasks.completionPercent, 60);
  assert.strictEqual(payload.checklists.completionPercent, 70);

  console.log('✅ test-unit-operations-kpi passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
