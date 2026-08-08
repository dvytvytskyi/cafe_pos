/**
 * Module 22 — CRM points adjustment integration (T22.3–T22.4)
 */
import assert from 'assert';
import { prisma } from './db.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M22-Points';

async function cleanup() {
  await prisma.loyaltyTransaction.deleteMany({
    where: { customer: { name: { startsWith: PREFIX } } },
  });
  await prisma.customer.deleteMany({
    where: { name: { startsWith: PREFIX } },
  });
}

async function createCustomer(name: string, points: number) {
  return prisma.customer.create({
    data: {
      name,
      phone: `+38099${Math.floor(Math.random() * 1e7).toString().padStart(7, '0')}`,
      email: `${name.replace(/\s/g, '').toLowerCase()}@test.com`,
      points,
      tier: 'Bronze',
      ltv: 0,
      visitCount: 0,
      joinedDate: '2026-01-01',
    },
  });
}

async function adjust(customerId: string, pointsDelta: number, reason?: string) {
  return fetch(`${BASE}/api/crm/customers/${customerId}/points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pointsDelta, reason }),
  });
}

async function main() {
  console.log('--- Module 22 CRM Points Integration Tests ---');
  await cleanup();

  const customer = await createCustomer(`${PREFIX} Balance`, 20);

  const overspend = await adjust(customer.id, -50, 'test overspend');
  const overspendBody = await overspend.json();
  if (overspend.status !== 409 || overspendBody.code !== 'INSUFFICIENT_POINTS') {
    console.error('❌ T22.5 overspend expected 409, got', overspend.status, overspendBody);
    process.exit(1);
  }
  const afterFail = await prisma.customer.findUnique({ where: { id: customer.id } });
  assert.strictEqual(afterFail?.points, 20);
  const txCountFail = await prisma.loyaltyTransaction.count({ where: { customerId: customer.id } });
  assert.strictEqual(txCountFail, 0);
  console.log('✅ T22.5 spend 50 with balance 20 blocked');

  const addRes = await adjust(customer.id, 5, 'bonus');
  const added = await addRes.json();
  if (addRes.status !== 200 || added.points !== 25) {
    console.error('❌ add points failed', addRes.status, added);
    process.exit(1);
  }
  console.log('✅ points add works');

  const capRes = await adjust(customer.id, 15000, 'big bonus');
  const capped = await capRes.json();
  if (capRes.status !== 200 || capped.points !== 10025) {
    console.error('❌ T22.2 cap failed', capRes.status, capped);
    process.exit(1);
  }
  console.log('✅ T22.2 max 10000 adjustment capped');

  const missing = await adjust('00000000-0000-0000-0000-000000000000', 5);
  if (missing.status !== 400) {
    console.error('❌ T22.3 missing customer expected 400, got', missing.status);
    process.exit(1);
  }
  const orphanTx = await prisma.loyaltyTransaction.count({
    where: { customerId: '00000000-0000-0000-0000-000000000000' },
  });
  assert.strictEqual(orphanTx, 0);
  console.log('✅ T22.3 rollback — no transaction on error');

  const raceCustomer = await createCustomer(`${PREFIX} Race`, 20);
  const [r1, r2] = await Promise.all([
    adjust(raceCustomer.id, -15, 'race-1'),
    adjust(raceCustomer.id, -15, 'race-2'),
  ]);
  const statuses = [r1.status, r2.status].sort();
  if (!statuses.includes(200) || !statuses.includes(409)) {
    console.error('❌ T22.4 concurrent race expected one 200 and one 409, got', statuses);
    process.exit(1);
  }
  const raceFinal = await prisma.customer.findUnique({ where: { id: raceCustomer.id } });
  assert.strictEqual(raceFinal?.points, 5);
  console.log('✅ T22.4 concurrent spend race → 409, no negative balance');

  await cleanup();
  console.log('--- Module 22 CRM Points Integration Tests Passed ---');
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await cleanup().catch(() => {});
  process.exit(1);
});
