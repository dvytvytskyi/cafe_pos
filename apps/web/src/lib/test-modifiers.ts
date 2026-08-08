import assert from 'assert';
import { prisma, disconnectDb } from './db.ts';
import { modifierRepository } from '../repositories/modifier.repository.ts';
import { menuRepository } from '../repositories/menu.repository.ts';
import { invalidateMenuCache } from './menu-cache.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M15-Test';

async function cleanup() {
  await invalidateMenuCache();
  await prisma.modifierOption.deleteMany({
    where: { group: { name: { startsWith: PREFIX } } },
  });
  await prisma.modifierGroup.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.menuItem.deleteMany({ where: { name: { startsWith: PREFIX } } });
  await prisma.menuCategory.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

export async function run() {
  console.log('--- Module 15 Modifiers Integration Tests ---');

  try {
    await cleanup();

    const badQtyRes = await fetch(`${BASE}/api/modifiers/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: `${PREFIX}-BadQty`, minQty: 5, maxQty: 1 }),
    });
    assert.strictEqual(badQtyRes.status, 400);

    const badPriceRes = await fetch(`${BASE}/api/modifiers/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${PREFIX}-BadPrice`,
        options: [{ name: 'X', price: -1 }],
      }),
    });
    assert.strictEqual(badPriceRes.status, 400);
    console.log('✅ T15.1/T15.2 API validation');

    const createRes = await fetch(`${BASE}/api/modifiers/groups`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: `${PREFIX}-Milk`,
        minQty: 0,
        maxQty: 1,
        options: [
          { name: 'Oat Milk', price: 0.8 },
          { name: 'Almond Milk', price: 0.8 },
        ],
      }),
    });
    assert.strictEqual(createRes.status, 201);
    const group = await createRes.json();
    assert.strictEqual(group.options.length, 2);
    const dbGroup = await prisma.modifierGroup.findUnique({
      where: { id: group.id },
      include: { options: true },
    });
    assert.ok(dbGroup);
    assert.strictEqual(dbGroup!.options.length, 2);
    console.log('✅ T15.3 create group + options in DB');

    const cat = await menuRepository.createCategory(`${PREFIX}-Coffee`);
    const linkRes = await fetch(`${BASE}/api/modifiers/groups/${group.id}/categories`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryIds: [cat.id] }),
    });
    assert.strictEqual(linkRes.status, 200);
    const linked = await linkRes.json();
    assert.ok(linked.categories.some((c: { id: string }) => c.id === cat.id));

    const menuRes = await fetch(`${BASE}/api/menu/categories`);
    const menu = await menuRes.json();
    const coffeeCat = menu.find((c: { id: string }) => c.id === cat.id);
    assert.ok(coffeeCat?.modifierGroups?.some((g: { id: string }) => g.id === group.id));
    console.log('✅ T15.4 category M2M association');

    console.log('✅ Module 15 integration tests passed.');
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
