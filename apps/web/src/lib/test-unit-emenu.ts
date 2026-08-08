import assert from 'assert';
import {
  searchDishesByName,
  filterDishesByAllergens,
  normalizeTableId,
  buildEmenuQrUrl,
  type EMenuDish,
} from './emenu.ts';

const sampleDishes: EMenuDish[] = [
  {
    id: '1',
    categoryId: 'c1',
    categoryName: 'Coffee',
    name: 'Corgi Latte',
    description: 'Smooth latte',
    image: '',
    basePrice: 4,
    allergens: ['Dairy'],
  },
  {
    id: '2',
    categoryId: 'c2',
    categoryName: 'Pastries',
    name: 'Almond Croissant',
    description: 'Flaky pastry',
    image: '',
    basePrice: 3.5,
    allergens: ['Gluten', 'Nuts'],
  },
  {
    id: '3',
    categoryId: 'c1',
    categoryName: 'Coffee',
    name: 'Espresso',
    description: 'Strong shot',
    image: '',
    basePrice: 2.5,
    allergens: [],
  },
];

export async function run() {
  console.log('Running test-unit-emenu...');

  // T5.1 — case-insensitive search
  const searchResults = searchDishesByName(sampleDishes, 'LATTE');
  assert.strictEqual(searchResults.length, 1);
  assert.strictEqual(searchResults[0].name, 'Corgi Latte');

  const partial = searchDishesByName(sampleDishes, 'ess');
  assert.strictEqual(partial.length, 1);
  assert.strictEqual(partial[0].name, 'Espresso');

  // T5.2 — allergen filter excludes dish
  const noNuts = filterDishesByAllergens(sampleDishes, ['Nuts']);
  assert.strictEqual(noNuts.length, 2);
  assert.ok(!noNuts.some((d) => d.name === 'Almond Croissant'));

  // T5.3 — empty allergen selection shows all
  assert.strictEqual(filterDishesByAllergens(sampleDishes, []).length, 3);

  // QR URL format
  const url = buildEmenuQrUrl('t4', 'default', 'http://localhost:3000');
  assert.ok(url.includes('/emenu?'));
  assert.ok(url.includes('location=default'));
  assert.ok(url.includes('table=t4'));

  assert.strictEqual(normalizeTableId('4'), 't4');
  assert.strictEqual(normalizeTableId('T7'), 't7');
  assert.strictEqual(normalizeTableId('abc-uuid-123'), 'abc-uuid-123');

  console.log('✅ test-unit-emenu passed.');
  const { queue } = await import('./queue/index.ts');
  await queue.closeAll().catch(() => {});
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
