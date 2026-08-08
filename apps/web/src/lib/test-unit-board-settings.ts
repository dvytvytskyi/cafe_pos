import assert from 'assert';
import { validateBoardStages, validateStageLabel } from './board-validation.ts';

export async function run() {
  console.log('Running test-unit-board-settings...');

  // T9.2 — empty column name blocked
  assert.strictEqual(validateStageLabel('').valid, false);
  assert.strictEqual(validateStageLabel('   ').valid, false);
  assert.match(validateStageLabel('').error ?? '', /empty/i);

  // T9.1 — duplicate column names blocked
  const dupStages = [
    { id: 'a', label: 'Backlog', color: 'bg-blue-500' },
    { id: 'b', label: 'backlog', color: 'bg-red-500' },
  ];
  assert.strictEqual(validateBoardStages(dupStages).valid, false);
  assert.match(validateBoardStages(dupStages).error ?? '', /duplicate/i);

  // valid board
  const valid = [
    { id: 'todo', label: 'To Do', color: 'bg-blue-500' },
    { id: 'done', label: 'Done', color: 'bg-green-500' },
  ];
  assert.strictEqual(validateBoardStages(valid).valid, true);

  // empty list blocked
  assert.strictEqual(validateBoardStages([]).valid, false);

  console.log('✅ test-unit-board-settings passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
