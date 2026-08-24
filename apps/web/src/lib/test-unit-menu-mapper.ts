import assert from 'assert';
import { mapCategoriesToPosMenu, resolvePosItemModifierGroups } from './mappers/menu.mapper.ts';

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

  const withItemMods = mapCategoriesToPosMenu([
    {
      id: 'c1',
      name: 'Food',
      modifierGroups: [{ id: 'g-cat', name: 'Cat only', minQty: 0, maxQty: 1, options: [{ id: 'o1', name: 'X', price: 1 }] }],
      items: [
        {
          id: 'm1',
          name: 'Toast',
          price: 10,
          modifierGroups: [{ id: 'g-item', name: 'Extra', minQty: 0, maxQty: 1, options: [{ id: 'o2', name: 'Cheese', price: 2 }] }],
        },
      ],
    },
  ]);
  assert.strictEqual(withItemMods[0].items[0].modifierGroups?.[0]?.id, 'g-item');

  const itemOnly = resolvePosItemModifierGroups(
    { modifierGroups: [{ id: 'g1', name: 'Size', minQty: 1, maxQty: 1, options: [{ id: 'o1', name: 'L', price: 1 }] }] },
    { modifierGroups: [{ id: 'g-cat', name: 'Cat', minQty: 0, maxQty: 1, options: [{ id: 'o0', name: 'Y', price: 0 }] }] }
  );
  assert.strictEqual(itemOnly[0]?.id, 'g1');

  const catFallback = resolvePosItemModifierGroups({ categoryId: 'c1' }, {
    modifierGroups: [{ id: 'g-cat', name: 'Cat', minQty: 0, maxQty: 1, options: [{ id: 'o0', name: 'Y', price: 0 }] }],
  });
  assert.strictEqual(catFallback[0]?.id, 'g-cat');

  console.log('✅ test-unit-menu-mapper passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => { console.error(e); process.exit(1); });
}
