/**
 * Module 27 — taxes API integration tests
 */
import { prisma, disconnectDb } from './db.ts';

const BASE = 'http://localhost:3000';

async function resetRates() {
  await fetch(`${BASE}/api/taxes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      rates: [
        { slug: 'food', ratePercent: 10 },
        { slug: 'alcohol', ratePercent: 21 },
      ],
    }),
  });
}

async function main() {
  console.log('--- Module 27 Taxes Integration Tests ---');
  await resetRates();

  const listRes = await fetch(`${BASE}/api/taxes`);
  const list = await listRes.json();
  if (listRes.status !== 200 || !Array.isArray(list) || list.length < 2) {
    console.error('❌ GET /api/taxes failed', listRes.status, list);
    process.exit(1);
  }
  const food = list.find((r: { slug: string }) => r.slug === 'food');
  const alcohol = list.find((r: { slug: string }) => r.slug === 'alcohol');
  if (food?.ratePercent !== 10 || alcohol?.ratePercent !== 21) {
    console.error('❌ default rates expected food 10 / alcohol 21', { food, alcohol });
    process.exit(1);
  }
  console.log('✅ GET /api/taxes → defaults food 10%, alcohol 21%');

  const putRes = await fetch(`${BASE}/api/taxes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rates: [{ slug: 'alcohol', ratePercent: 22 }] }),
  });
  if (putRes.status !== 200) {
    console.error('❌ PUT alcohol 22 failed', putRes.status, await putRes.json());
    process.exit(1);
  }
  console.log('✅ PUT alcohol rate → 22%');

  const calcRes = await fetch(`${BASE}/api/taxes/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [{ name: 'Craft Beer', price: 12, quantity: 1 }],
    }),
  });
  const calc = await calcRes.json();
  if (calcRes.status !== 200 || calc.rates?.alcohol !== 22) {
    console.error('❌ calculate should use DB alcohol 22%', calcRes.status, calc);
    process.exit(1);
  }
  if (!calc.breakdown?.alcoholTax || calc.breakdown.alcoholTax <= 0) {
    console.error('❌ breakdown missing alcohol tax', calc);
    process.exit(1);
  }
  console.log('✅ T27.6 order tax calc uses TaxRate from DB (alcohol 22%)');

  const badRes = await fetch(`${BASE}/api/taxes`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rates: [{ slug: 'food', ratePercent: 150 }] }),
  });
  if (badRes.status !== 400) {
    console.error('❌ invalid rate expected 400, got', badRes.status);
    process.exit(1);
  }
  console.log('✅ invalid rate → 400');

  await resetRates();
  await disconnectDb();
  console.log('--- Module 27 Taxes Integration Tests Passed ---');
}

main().catch(async (err) => {
  console.error(err);
  await resetRates().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
