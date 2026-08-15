import assert from 'assert';
import { prisma, disconnectDb } from './db.ts';
import { menuRepository } from '../repositories/menu.repository.ts';
import { invalidateMenuCache } from './menu-cache.ts';

const BASE = 'http://localhost:3000';
const TEST_PREFIX = 'M14-Test';

async function cleanup() {
  await invalidateMenuCache();
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  await prisma.menuCategory.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
}

export async function run() {
  console.log('--- Module 14 DishModal Integration Tests ---');

  try {
    await cleanup();

    const cat = await menuRepository.createCategory(`${TEST_PREFIX}-Cat`);
    const badPriceRes = await fetch(`${BASE}/api/menu/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${TEST_PREFIX}-BadPrice`,
        price: 'abc',
        categoryId: cat.id,
      }),
    });
    assert.strictEqual(badPriceRes.status, 400);
    console.log('✅ T14.1 API rejects invalid price');

    const badAllergenRes = await fetch(`${BASE}/api/menu/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${TEST_PREFIX}-BadAllergen`,
        price: 3.5,
        categoryId: cat.id,
        allergens: ['UnknownAllergen'],
      }),
    });
    assert.strictEqual(badAllergenRes.status, 400);
    console.log('✅ T14.2 API rejects invalid allergen');

    const peanutsRes = await fetch(`${BASE}/api/menu/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${TEST_PREFIX}-PeanutsOk`,
        price: 3.5,
        categoryId: cat.id,
        allergens: ['Peanuts'],
      }),
    });
    assert.strictEqual(peanutsRes.status, 201);
    console.log('✅ T14.2 API accepts EU allergen Peanuts');

    // T14.4 — create MenuItem + allergens
    const createRes = await fetch(`${BASE}/api/menu/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${TEST_PREFIX}-Dish`,
        description: 'Integration dish',
        price: 5.25,
        categoryId: cat.id,
        allergens: ['Gluten', 'Milk'],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const created = await createRes.json();
    assert.deepStrictEqual(created.allergens.sort(), ['Gluten', 'Milk']);
    const dbItem = await prisma.menuItem.findUnique({ where: { id: created.id } });
    assert.ok(dbItem);
    assert.deepStrictEqual([...(dbItem!.allergens)].sort(), ['Gluten', 'Milk']);
    console.log('✅ T14.4 create dish with allergens');

    // T14.5 — soft archive excluded from default menu
    const archiveRes = await fetch(`${BASE}/api/menu/items/${created.id}`, { method: 'DELETE' });
    assert.strictEqual(archiveRes.status, 200);
    const archived = await archiveRes.json();
    assert.strictEqual(archived.isArchived, true);

    const menuRes = await fetch(`${BASE}/api/menu/categories`);
    const menu = await menuRes.json();
    const allItems = menu.flatMap((c: { items: { id: string }[] }) => c.items);
    assert.ok(!allItems.some((i: { id: string }) => i.id === created.id));
    console.log('✅ T14.5 archived dish excluded from active menu');

    console.log('✅ Module 14 integration tests passed.');
  } finally {
    await cleanup();
    await disconnectDb();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
