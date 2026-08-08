import assert from 'assert';
import { isValidDateParam, formatDateParam, parseDateParam } from './task-dates.ts';

export async function run() {
  console.log('Running test-unit-tasks...');

  // T7.1 — valid YYYY-MM-DD
  assert.strictEqual(isValidDateParam('2026-08-05'), true);
  assert.strictEqual(isValidDateParam('2024-02-29'), true);
  assert.strictEqual(formatDateParam(new Date(2026, 7, 5)), '2026-08-05');

  // T7.1 — invalid formats rejected
  assert.strictEqual(isValidDateParam('05-08-2026'), false);
  assert.strictEqual(isValidDateParam('2026/08/05'), false);
  assert.strictEqual(isValidDateParam('2026-13-01'), false);
  assert.strictEqual(isValidDateParam('2026-02-30'), false);
  assert.strictEqual(isValidDateParam('not-a-date'), false);

  const parsed = parseDateParam('2026-08-05');
  assert.strictEqual(parsed.getFullYear(), 2026);
  assert.strictEqual(parsed.getMonth(), 7);
  assert.strictEqual(parsed.getDate(), 5);

  console.log('✅ test-unit-tasks passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
