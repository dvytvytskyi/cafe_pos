/**
 * Module 20 — CRM admin integration tests (T20.4–T20.5, T20.7 regression)
 */
import assert from 'assert';
import { prisma } from './db.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M20-CrmAdmin';

async function cleanup() {
  await prisma.loyaltyTransaction.deleteMany({
    where: { customer: { name: { startsWith: PREFIX } } },
  });
  await prisma.customer.deleteMany({
    where: { name: { startsWith: PREFIX } },
  });
}

async function createCustomer(name: string, phone: string, points = 0, lastVisitDate?: string) {
  return prisma.customer.create({
    data: {
      name,
      phone,
      email: `${name.replace(/\s/g, '').toLowerCase()}@test.com`,
      points,
      lastVisitDate,
      tier: 'Bronze',
      ltv: 0,
      visitCount: 0,
      joinedDate: '2026-01-01',
    },
  });
}

async function main() {
  console.log('--- Module 20 CRM Admin Integration Tests ---');

  await cleanup();

  const c1 = await createCustomer(`${PREFIX} Alpha`, `+380990000001`, 10, '2026-07-01');
  const c2 = await createCustomer(`${PREFIX} Beta`, `+380990000002`, 50, '2026-07-10');
  const c3 = await createCustomer(`${PREFIX} Gamma`, `+380990000003`, 25, '2026-06-15');

  // T20.4 — pagination offset/limit
  const page1 = await fetch(`${BASE}/api/crm/customers?page=1&limit=2&search=${encodeURIComponent(PREFIX)}&sortBy=bonusPoints&sortOrder=desc`);
  const page1Data = await page1.json();
  if (page1.status !== 200 || page1Data.items?.length !== 2 || page1Data.total < 3) {
    console.error('❌ T20.4 page 1 failed:', page1.status, page1Data);
    process.exit(1);
  }
  assertPageOrder(page1Data.items, ['Beta', 'Gamma']);

  const page2 = await fetch(`${BASE}/api/crm/customers?page=2&limit=2&search=${encodeURIComponent(PREFIX)}&sortBy=bonusPoints&sortOrder=desc`);
  const page2Data = await page2.json();
  if (page2.status !== 200 || page2Data.items?.length !== 1) {
    console.error('❌ T20.4 page 2 failed:', page2.status, page2Data);
    process.exit(1);
  }
  assert.strictEqual(page2Data.items[0].name, `${PREFIX} Alpha`);
  console.log('✅ T20.4 pagination offset/limit');

  // T20.3 via API — invalid pagination
  const badPage = await fetch(`${BASE}/api/crm/customers?page=0&limit=20`);
  if (badPage.status !== 400) {
    console.error('❌ T20.3 bad page expected 400, got', badPage.status);
    process.exit(1);
  }
  const badLimit = await fetch(`${BASE}/api/crm/customers?page=1&limit=200`);
  if (badLimit.status !== 400) {
    console.error('❌ T20.3 bad limit expected 400, got', badLimit.status);
    process.exit(1);
  }
  console.log('✅ T20.3 pagination API validation');

  // T20.5 — list response has no joined orders/transactions
  for (const item of [...page1Data.items, ...page2Data.items]) {
    if ('transactions' in item || 'orders' in item || 'giftCards' in item) {
      console.error('❌ T20.5 list item includes joined relations:', Object.keys(item));
      process.exit(1);
    }
  }
  console.log('✅ T20.5 no cascade JOIN in customer list');

  // Phone normalize on create
  const createRes = await fetch(`${BASE}/api/crm/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${PREFIX} Normalized`,
      phone: '099 888 9999',
      email: 'normalized@test.com',
    }),
  });
  const created = await createRes.json();
  if (createRes.status !== 201 || created.phone !== '+380998889999') {
    console.error('❌ Phone normalize on create failed:', createRes.status, created);
    process.exit(1);
  }
  console.log('✅ Phone normalized on POST');

  // T20.7 — regression: flat list still works
  const listRes = await fetch(`${BASE}/api/crm/customers`);
  const list = await listRes.json();
  if (!Array.isArray(list)) {
    console.error('❌ T20.7 expected array for non-paginated GET');
    process.exit(1);
  }
  console.log('✅ T20.7 backward-compatible flat list');

  await cleanup();
  console.log('--- Module 20 CRM Admin Integration Tests Passed ---');
  process.exit(0);
}

function assertPageOrder(items: { name: string }[], expectedNames: string[]) {
  const names = items.map((i) => i.name.replace(/^M20-CrmAdmin /, ''));
  for (let i = 0; i < expectedNames.length; i++) {
    if (!items[i]?.name.includes(expectedNames[i]!)) {
      console.error(`❌ Expected ${expectedNames[i]} at index ${i}, got ${items[i]?.name}`);
      process.exit(1);
    }
  }
}

main().catch(async (err) => {
  console.error(err);
  await cleanup().catch(() => {});
  process.exit(1);
});
