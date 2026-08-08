/**
 * Modules 21 — CRM customer modal integration (T21.3)
 */
import assert from 'assert';
import { prisma } from './db.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M21-CrmModal';

async function cleanup() {
  await prisma.loyaltyTransaction.deleteMany({
    where: { customer: { name: { startsWith: PREFIX } } },
  });
  await prisma.customer.deleteMany({
    where: { name: { startsWith: PREFIX } },
  });
}

async function main() {
  console.log('--- Module 21 CRM Modal Integration Tests ---');
  await cleanup();

  const phone = '+380991234567';
  const first = await fetch(`${BASE}/api/crm/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${PREFIX} First`,
      phone,
      email: 'first@test.com',
    }),
  });
  assert.strictEqual(first.status, 201);

  const dup = await fetch(`${BASE}/api/crm/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${PREFIX} Duplicate`,
      phone: '0991234567',
      email: 'dup@test.com',
    }),
  });
  const dupBody = await dup.json();
  if (dup.status !== 409 || dupBody.code !== 'PHONE_DUPLICATE') {
    console.error('❌ T21.3 expected 409 PHONE_DUPLICATE, got', dup.status, dupBody);
    process.exit(1);
  }
  console.log('✅ T21.3 duplicate phone → 409 PHONE_DUPLICATE');

  const invalidPhone = await fetch(`${BASE}/api/crm/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${PREFIX} Bad Phone`,
      phone: '1234',
      email: 'badphone@test.com',
    }),
  });
  if (invalidPhone.status !== 400) {
    console.error('❌ T21.1 API invalid phone expected 400, got', invalidPhone.status);
    process.exit(1);
  }
  console.log('✅ T21.1 invalid phone rejected by API');

  const invalidEmail = await fetch(`${BASE}/api/crm/customers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${PREFIX} Bad Email`,
      phone: '+380991234568',
      email: 'not-valid',
    }),
  });
  if (invalidEmail.status !== 400) {
    console.error('❌ T21.2 API invalid email expected 400, got', invalidEmail.status);
    process.exit(1);
  }
  console.log('✅ T21.2 invalid email rejected by API');

  await cleanup();
  console.log('--- Module 21 CRM Modal Integration Tests Passed ---');
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await cleanup().catch(() => {});
  process.exit(1);
});
