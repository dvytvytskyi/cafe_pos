import assert from 'assert';
import { prisma, disconnectDb } from './db.ts';
import { menuRepository } from '../repositories/menu.repository.ts';
import { cache } from './cache/index.ts';
import { menuCategoriesCacheKey, invalidateMenuCache } from './menu-cache.ts';

const BASE = 'http://localhost:3000';
const TEST_PREFIX = 'M13-Test';

async function cleanup() {
  await invalidateMenuCache();
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
  await prisma.menuCategory.deleteMany({ where: { name: { startsWith: TEST_PREFIX } } });
}

export async function run() {
  console.log('--- Module 13 MenusView Integration Tests ---');

  try {
    await cleanup();

    const created: string[] = [];
    for (let i = 0; i < 3; i++) {
      const cat = await menuRepository.createCategory(`${TEST_PREFIX}-Cat-${i}`);
      created.push(cat.id);
    }

    const reversed = [...created].reverse();
    const reorderRes = await fetch(`${BASE}/api/menu/categories/reorder`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reversed }),
    });
    assert.strictEqual(reorderRes.status, 200);

    const dbOrder = await prisma.menuCategory.findMany({
      where: { id: { in: created } },
      orderBy: { sortOrder: 'asc' },
    });
    assert.deepStrictEqual(dbOrder.map((c) => c.id), reversed);
    console.log('✅ T13.4 bulk sortOrder consistent in DB');

    await cache.set(menuCategoriesCacheKey(false), [{ id: 'stale' }], 300);
    const renameRes = await fetch(`${BASE}/api/menu/categories/${created[0]}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${TEST_PREFIX}-Renamed` }),
    });
    assert.strictEqual(renameRes.status, 200);
    const cached = await cache.get(menuCategoriesCacheKey(false));
    assert.strictEqual(cached, null);
    console.log('✅ T13.5 menu cache invalidated');

    const itemRes = await fetch(`${BASE}/api/menu/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${TEST_PREFIX}-Dish`,
        price: 2.5,
        categoryId: created[1],
      }),
    });
    const item = await itemRes.json();
    assert.strictEqual(itemRes.status, 201);

    const blockRes = await fetch(`${BASE}/api/menu/categories/${created[1]}?mode=block`, {
      method: 'DELETE',
    });
    assert.strictEqual(blockRes.status, 409);

    const cascadeRes = await fetch(`${BASE}/api/menu/categories/${created[1]}?mode=cascade`, {
      method: 'DELETE',
    });
    assert.strictEqual(cascadeRes.status, 200);
    const archivedCat = await prisma.menuCategory.findUnique({ where: { id: created[1] } });
    const archivedItem = await prisma.menuItem.findUnique({ where: { id: item.id } });
    assert.strictEqual(archivedCat?.isArchived, true);
    assert.strictEqual(archivedItem?.isArchived, true);
    console.log('✅ T13.6 delete blocked / cascade archive');

    const getRes = await fetch(`${BASE}/api/menu/categories`);
    const activeCats = await getRes.json();
    assert.ok(!activeCats.some((c: { id: string }) => c.id === created[1]));
    console.log('✅ T13.9 regression GET categories OK');

    console.log('✅ Module 13 integration tests passed.');
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
