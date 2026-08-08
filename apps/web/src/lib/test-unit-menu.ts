import assert from 'assert';
import {
  shiftSortOrder,
  validateCategoryName,
  filterDishesBySearch,
  MenuValidationError,
} from './menu-validation.ts';

interface MenuItem {
  name: string;
  price: number;
  allergens: string[];
}

function filterMenuByAllergensAndPrice(items: MenuItem[], allergensToExclude: string[], maxPrice: number): MenuItem[] {
  return items
    .filter(item => item.price <= maxPrice)
    .filter(item => !item.allergens.some(a => allergensToExclude.includes(a)));
}

export async function run() {
  console.log('Running test-unit-menu...');

  const items: MenuItem[] = [
    { name: 'Espresso', price: 2.50, allergens: [] },
    { name: 'Hazelnut Latte', price: 4.50, allergens: ['nuts', 'dairy'] },
    { name: 'Corgi Special Pancake', price: 10.00, allergens: ['dairy', 'gluten'] }
  ];

  const filtered = filterMenuByAllergensAndPrice(items, ['nuts', 'dairy'], 5.00);
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].name, 'Espresso');

  // T13.1 — sortOrder shift index 4→1
  const cats = [
    { id: 'a', sortOrder: 0 },
    { id: 'b', sortOrder: 1 },
    { id: 'c', sortOrder: 2 },
    { id: 'd', sortOrder: 3 },
    { id: 'e', sortOrder: 4 },
  ];
  const reordered = shiftSortOrder(cats, 4, 1);
  assert.deepStrictEqual(
    reordered.map((c) => c.id),
    ['a', 'e', 'b', 'c', 'd']
  );
  assert.deepStrictEqual(
    reordered.map((c) => c.sortOrder),
    [0, 1, 2, 3, 4]
  );

  // T13.2 — empty category name
  assert.throws(() => validateCategoryName('   '), MenuValidationError);
  assert.strictEqual(validateCategoryName('  Coffee  '), 'Coffee');

  // T13.3 — case-insensitive search
  const dishes = [
    { name: 'Flat White', description: 'Smooth milk' },
    { name: 'Espresso', description: 'Strong COFFEE shot' },
  ];
  const searchHits = filterDishesBySearch(dishes, 'coffee');
  assert.strictEqual(searchHits.length, 1);
  assert.strictEqual(searchHits[0].name, 'Espresso');

  console.log('✅ test-unit-menu passed.');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
