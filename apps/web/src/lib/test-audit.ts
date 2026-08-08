/**
 * Module 29 — audit panel integration tests
 */
import { prisma, disconnectDb } from './db.ts';

const BASE = 'http://localhost:3000';

async function seedLogs(count: number) {
  for (let i = 0; i < count; i++) {
    await fetch(`${BASE}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'cash_adjustment',
        details: { index: i, suite: 'M29_perf' },
        userId: 'user-a',
      }),
    });
  }
}

async function main() {
  console.log('--- Module 29 Audit Integration Tests ---');

  const post1 = await fetch(`${BASE}/api/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'shift_open', details: { float: 100 }, userId: 'mgr-1' }),
  });
  const log1 = await post1.json();
  if (post1.status !== 201 || !log1.hash) {
    console.error('❌ genesis log failed', post1.status, log1);
    process.exit(1);
  }
  console.log('✅ POST audit entry → 201');

  const post2 = await fetch(`${BASE}/api/audit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'cash_adjustment', details: { amount: 5 }, userId: 'mgr-1' }),
  });
  const log2 = await post2.json();
  if (log2.prevHash !== log1.hash) {
    console.error('❌ chain broken between log1 and log2');
    process.exit(1);
  }
  console.log('✅ cryptochain links verified');

  const filtered = await fetch(`${BASE}/api/audit?action=shift_open&userId=mgr-1&limit=10`);
  const filteredBody = await filtered.json();
  if (filtered.status !== 200 || !filteredBody.items?.some((l: { action: string }) => l.action === 'shift_open')) {
    console.error('❌ T29.3 filter by action/user failed', filtered.status, filteredBody);
    process.exit(1);
  }
  console.log('✅ T29.3 filter by action/user');

  const badFilter = await fetch(`${BASE}/api/audit?action=not_real_action`);
  if (badFilter.status !== 400) {
    console.error('❌ invalid filter expected 400');
    process.exit(1);
  }
  console.log('✅ invalid filter → 400');

  try {
    await prisma.auditLog.delete({ where: { id: log1.id } });
    console.error('❌ T29.2 DELETE should be blocked by trigger');
    process.exit(1);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes('immutable') && !msg.includes('AuditLog')) {
      console.error('❌ unexpected delete error', msg);
      process.exit(1);
    }
  }
  console.log('✅ T29.2 SQL DELETE on AuditLog → blocked');

  const start = Date.now();
  await seedLogs(150);
  const perfRes = await fetch(`${BASE}/api/audit?action=cash_adjustment&userId=user-a&limit=100`);
  const perfBody = await perfRes.json();
  const elapsed = Date.now() - start;
  if (perfRes.status !== 200 || perfBody.items?.length !== 100 || perfBody.total < 150) {
    console.error('❌ indexed query failed', perfRes.status, perfBody);
    process.exit(1);
  }
  if (elapsed > 15000) {
    console.error('❌ T29.4 query too slow', elapsed, 'ms');
    process.exit(1);
  }
  console.log(`✅ T29.4 filtered query (${perfBody.total} matches, ${elapsed}ms seed+fetch)`);

  await disconnectDb();
  console.log('--- Module 29 Audit Integration Tests Passed ---');
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb().catch(() => {});
  process.exit(1);
});
