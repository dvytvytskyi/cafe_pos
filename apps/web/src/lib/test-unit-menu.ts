import assert from 'assert';

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

  // Exclude nuts and dairy, max price €5.00 -> only Espresso remains
  const filtered = filterMenuByAllergensAndPrice(items, ['nuts', 'dairy'], 5.00);

  assert.strictEqual(filtered.length, 1, 'Filtered menu size should be 1');
  assert.strictEqual(filtered[0].name, 'Espresso', 'Filtered menu item must match Espresso');

  console.log('✅ test-unit-menu passed.');
}
