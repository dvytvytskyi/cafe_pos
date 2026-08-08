import assert from 'assert';
import { prisma, disconnectDb } from './db.ts';
import {
  boardSettingsRepository,
  BoardValidationError,
} from '../repositories/board-settings.repository.ts';
import { DEFAULT_TASK_STAGES } from './board-settings.ts';

const LOCATION = 'test-board-m9';
const TYPE = 'tasks' as const;

async function cleanup() {
  await prisma.boardSettings.deleteMany({
    where: { type: TYPE, locationId: LOCATION },
  });
}

export async function run() {
  console.log('--- Module 9 BoardSettings Integration Tests ---');

  try {
    await cleanup();

    // T9.3 — save columns → reload → same structure
    const customStages = [
      { id: 'todo', label: 'To Do', color: 'bg-blue-500' },
      { id: 'wip', label: 'Work In Progress', color: 'bg-orange-500' },
      { id: 'done', label: 'Done', color: 'bg-green-500' },
    ];

    const saved = await boardSettingsRepository.save(TYPE, customStages, LOCATION);
    assert.strictEqual(saved.length, 3);
    assert.strictEqual(saved[1].label, 'Work In Progress');

    const reloaded = await boardSettingsRepository.get(TYPE, LOCATION);
    assert.strictEqual(reloaded.length, 3);
    assert.deepStrictEqual(
      reloaded.map((s) => ({ id: s.id, label: s.label })),
      customStages.map((s) => ({ id: s.id, label: s.label }))
    );
    console.log('✅ T9.3 Save columns → reload → same structure');

    // T9.1 integration — duplicate names rejected
    let threw = false;
    try {
      await boardSettingsRepository.save(
        TYPE,
        [
          { id: 'a', label: 'Same', color: 'bg-blue-500' },
          { id: 'b', label: 'same', color: 'bg-red-500' },
        ],
        LOCATION
      );
    } catch (err) {
      threw = err instanceof BoardValidationError;
    }
    assert.ok(threw, 'Expected BoardValidationError for duplicate labels');
    console.log('✅ T9.1 Duplicate column names blocked (repository)');

    // T9.2 integration — empty name rejected
    threw = false;
    try {
      await boardSettingsRepository.save(
        TYPE,
        [{ id: 'x', label: '   ', color: 'bg-gray-400' }],
        LOCATION
      );
    } catch (err) {
      threw = err instanceof BoardValidationError;
    }
    assert.ok(threw, 'Expected BoardValidationError for empty label');
    console.log('✅ T9.2 Empty column name blocked (repository)');

    // defaults seeded for new location
    await cleanup();
    const defaults = await boardSettingsRepository.get(TYPE, LOCATION);
    assert.strictEqual(defaults.length, DEFAULT_TASK_STAGES.length);
    assert.strictEqual(defaults[0].id, 'todo');
    console.log('✅ Default task stages seeded on first get');

    console.log('✅ Module 9 integration tests passed.');
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
