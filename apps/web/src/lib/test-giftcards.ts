/**
 * Module 28 — gift cards integration tests
 */
import { prisma, disconnectDb } from './db.ts';
import { isValidGiftCardCode } from './gift-card-validation.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M28-Integration';

async function cleanup() {
  await prisma.giftCard.deleteMany({
    where: { OR: [{ code: { startsWith: 'CORGI-' } }] },
  });
}

async function main() {
  console.log('--- Module 28 Gift Cards Integration Tests ---');
  await cleanup();

  const createRes = await fetch(`${BASE}/api/giftcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initialBalance: 50 }),
  });
  const created = await createRes.json();
  if (createRes.status !== 201 || !isValidGiftCardCode(created.code)) {
    console.error('❌ create failed or invalid code format', createRes.status, created);
    process.exit(1);
  }
  console.log('✅ POST single gift card with valid code format');

  const batchRes = await fetch(`${BASE}/api/giftcards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initialBalance: 50, count: 5 }),
  });
  const batch = await batchRes.json();
  if (batchRes.status !== 201 || !Array.isArray(batch) || batch.length !== 5) {
    console.error('❌ T28.3 batch create failed', batchRes.status, batch);
    process.exit(1);
  }
  if (!batch.every((c: { code: string }) => isValidGiftCardCode(c.code))) {
    console.error('❌ batch codes invalid format');
    process.exit(1);
  }
  console.log('✅ T28.3 batch create 5×€50 in transaction');

  const codes = new Set(batch.map((c: { code: string }) => c.code));
  if (codes.size !== 5) {
    console.error('❌ T28.4 duplicate codes in batch');
    process.exit(1);
  }
  console.log('✅ T28.4 all batch codes unique');

  const testCode = created.code as string;

  const redeem1 = await fetch(`${BASE}/api/giftcards/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: testCode, amount: 20 }),
  });
  const r1 = await redeem1.json();
  if (redeem1.status !== 200 || !r1.success || r1.remainingBalance !== 30) {
    console.error('❌ redeem 1 failed', redeem1.status, r1);
    process.exit(1);
  }
  console.log('✅ redeem €20 → €30 remaining');

  const patchRes = await fetch(`${BASE}/api/giftcards/${created.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'disabled' }),
  });
  if (patchRes.status !== 200) {
    console.error('❌ PATCH disable failed', patchRes.status, await patchRes.json());
    process.exit(1);
  }
  console.log('✅ PATCH disable card');

  const redeemDisabled = await fetch(`${BASE}/api/giftcards/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: testCode, amount: 5 }),
  });
  const rd = await redeemDisabled.json();
  if (rd.success) {
    console.error('❌ disabled card should not redeem');
    process.exit(1);
  }
  console.log('✅ disabled card rejected at redeem');

  const expired = await prisma.giftCard.create({
    data: {
      code: 'CORGI-ABCD-EFGH',
      initialBalance: 25,
      balance: 25,
      status: 'active',
      expiryDate: new Date(Date.now() - 86400000),
    },
  });
  const redeemExpired = await fetch(`${BASE}/api/giftcards/redeem`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: expired.code, amount: 5 }),
  });
  const re = await redeemExpired.json();
  if (re.success) {
    console.error('❌ T28.7 expired card should be rejected');
    process.exit(1);
  }
  console.log('✅ T28.7 expired card rejected at redeem');

  const badPatch = await fetch(`${BASE}/api/giftcards/${created.id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'invalid' }),
  });
  if (badPatch.status !== 400) {
    console.error('❌ invalid status expected 400');
    process.exit(1);
  }
  console.log('✅ invalid PATCH → 400');

  await cleanup();
  await disconnectDb();
  console.log('--- Module 28 Gift Cards Integration Tests Passed ---');
}

main().catch(async (err) => {
  console.error(err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
