import assert from 'assert';
import {
  buildCompletionFields,
  assertEditableChecklistDate,
  ChecklistValidationError,
  ChecklistForbiddenError,
} from './checklist-validation.ts';
import { formatDateParam } from './task-dates.ts';

export async function run() {
  console.log('Running test-unit-checklists...');

  // T10.1 — completion object has timestamp + userId
  const done = buildCompletionFields(true, 'user-abc');
  assert.ok(done.completedAt instanceof Date);
  assert.strictEqual(done.completedById, 'user-abc');

  const cleared = buildCompletionFields(false, 'user-abc');
  assert.strictEqual(cleared.completedAt, null);
  assert.strictEqual(cleared.completedById, null);

  let threw = false;
  try {
    buildCompletionFields(true, '');
  } catch (err) {
    threw = err instanceof ChecklistValidationError;
  }
  assert.ok(threw, 'Expected validation error when userId missing on complete');

  // T10.2 unit — past date guard (shift check is integration)
  const today = formatDateParam(new Date());
  const yesterday = formatDateParam(new Date(Date.now() - 86400000));
  assert.throws(() => assertEditableChecklistDate(yesterday), ChecklistForbiddenError);
  assert.doesNotThrow(() => assertEditableChecklistDate(today));

  console.log('✅ test-unit-checklists passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
