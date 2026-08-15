import assert from 'assert';
import { prisma, disconnectDb } from './db.ts';

const BASE = 'http://localhost:3000';
const testCategoryName = 'Test Drinks Category';
const testItemName = 'Test Mocha Mint';

async function cleanup() {
  await prisma.menuItem.deleteMany({ where: { name: testItemName } });
  await prisma.menuCategory.deleteMany({ where: { name: testCategoryName } });
}

async function main() {
  console.log('--- Starting Menu & Dishes Integration Test ---');

  try {
    await cleanup();

    const catRes = await fetch(`${BASE}/api/menu/categories`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testCategoryName }),
    });
    const createdCat = await catRes.json();
    assert.strictEqual(catRes.status, 201);
    assert.ok(createdCat.id);
    console.log('✅ Success: Menu category created.');

    const categoryId = createdCat.id;

    const itemRes = await fetch(`${BASE}/api/menu/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testItemName,
        description: 'Mint flavored double mocha shot',
        price: 3.5,
        categoryId,
        allergens: ['Milk', 'Gluten'],
      }),
    });
    const createdItem = await itemRes.json();
    assert.strictEqual(itemRes.status, 201);
    assert.strictEqual(createdItem.price, 3.5);
    console.log('✅ Success: Menu item created.');

    const itemId = createdItem.id;

    const updateRes = await fetch(`${BASE}/api/menu/items/${itemId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ price: 4.25 }),
    });
    const updatedItem = await updateRes.json();
    assert.strictEqual(updateRes.status, 200);
    assert.strictEqual(updatedItem.price, 4.25);

    const dbItem = await prisma.menuItem.findUnique({ where: { id: itemId } });
    const history = dbItem?.priceHistory as { price: number }[];
    assert.ok(history && history.length === 1 && history[0].price === 3.5);
    console.log('✅ Success: Price history audit log generated successfully.');

    const deleteRes = await fetch(`${BASE}/api/menu/items/${itemId}`, { method: 'DELETE' });
    const deletedItem = await deleteRes.json();
    assert.strictEqual(deleteRes.status, 200);
    assert.strictEqual(deletedItem.isArchived, true);
    console.log('✅ Success: Menu item archived successfully.');

    const getRes = await fetch(`${BASE}/api/menu/categories`);
    const getResult = await getRes.json();
    const currentCat = getResult.find((c: { id: string }) => c.id === categoryId);
    assert.ok(currentCat && currentCat.items.length === 0);
    console.log('✅ Success: Active items returned successfully (archived items filtered out).');

    await cleanup();
    console.log('--- Menu & Dishes Integration Test Passed Successfully ---');
  } catch (error) {
    console.error('Unexpected error during Menu/Dishes integration test:', error);
    await cleanup().catch(() => {});
    await disconnectDb();
    process.exit(1);
  }

  await disconnectDb();
  process.exit(0);
}

main();
