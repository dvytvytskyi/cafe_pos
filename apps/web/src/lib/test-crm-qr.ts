/**
 * Module 23 — CRM QR integration (T23.2–T23.3)
 */
import assert from 'assert';
import { prisma } from './db.ts';
import { buildCustomerQrCode } from './crm-validation.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M23-QR';

async function cleanup() {
  await prisma.customer.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

async function main() {
  console.log('--- Module 23 CRM QR Integration Tests ---');
  await cleanup();

  const customer = await prisma.customer.create({
    data: {
      name: `${PREFIX} Scan Me`,
      phone: '+380995555555',
      email: 'qr-scan@test.com',
      tier: 'Gold',
      points: 12.5,
      ltv: 50,
      visitCount: 2,
      joinedDate: '2026-01-01',
    },
  });

  const token = buildCustomerQrCode(customer.id);
  const validRes = await fetch(`${BASE}/api/crm/customers/by-qr?code=${encodeURIComponent(token)}`);
  const validBody = await validRes.json();

  if (validRes.status !== 200 || validBody.id !== customer.id || validBody.name !== customer.name) {
    console.error('❌ T23.2 valid code failed', validRes.status, validBody);
    process.exit(1);
  }
  console.log('✅ T23.2 valid code → 200 + customer');

  const invalidFormat = await fetch(`${BASE}/api/crm/customers/by-qr?code=bad-token`);
  if (invalidFormat.status !== 400) {
    console.error('❌ invalid format expected 400, got', invalidFormat.status);
    process.exit(1);
  }
  console.log('✅ invalid QR format → 400');

  const missing = await fetch(
    `${BASE}/api/crm/customers/by-qr?code=${encodeURIComponent('crm_client:00000000-0000-0000-0000-000000000000')}`
  );
  if (missing.status !== 404) {
    console.error('❌ T23.3 invalid code expected 404, got', missing.status);
    process.exit(1);
  }
  console.log('✅ T23.3 invalid code → 404');

  await cleanup();
  console.log('--- Module 23 CRM QR Integration Tests Passed ---');
  process.exit(0);
}

main().catch(async (err) => {
  console.error(err);
  await cleanup().catch(() => {});
  process.exit(1);
});
