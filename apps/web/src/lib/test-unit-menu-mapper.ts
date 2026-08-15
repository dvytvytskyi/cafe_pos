import assert from 'assert';
import { mapCategoriesToPosMenu } from './mappers/menu.mapper.ts';

export async function run() {
  console.log('Running test-unit-menu-mapper...');

  assert.deepStrictEqual(mapCategoriesToPosMenu([]), []);
  assert.deepStrictEqual(mapCategoriesToPosMenu(null), []);
  assert.deepStrictEqual(mapCategoriesToPosMenu(undefined), []);

  const mapped = mapCategoriesToPosMenu([
    {
      id: 'c1',
      name: 'Coffee',
      items: [{ id: 'm1', name: 'Espresso', price: 2.5, allergens: ['Milk'] }],
    },
  ]);

  assert.strictEqual(mapped.length, 1);
  assert.strictEqual(mapped[0].name, 'Coffee');
  assert.strictEqual(mapped[0].items[0].name, 'Espresso');
  assert.deepStrictEqual(mapped[0].items[0].allergens, ['Milk']);

  console.log('✅ test-unit-menu-mapper passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
