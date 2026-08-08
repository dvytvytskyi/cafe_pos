/**
 * Module 29 — legacy audit trail integration (T29.6 regression)
 */
import { prisma, disconnectDb } from './db.ts';

const BASE = 'http://localhost:3000';

async function main() {
  console.log('--- Legacy Audit Trail Integration Test ---');

  const post = async (action: string, details: Record<string, unknown>) => {
    const res = await fetch(`${BASE}/api/audit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, details }),
    });
    return { status: res.status, body: await res.json() };
  };

  const log1 = await post('shift_open', { manager: 'John Doe', float: 100 });
  if (log1.status !== 201 || !log1.body.hash) {
    console.error('❌ first log failed', log1.status, log1.body);
    process.exit(1);
  }

  const log2 = await post('cash_adjustment', { type: 'out', amount: 20 });
  if (log2.status !== 201 || log2.body.prevHash !== log1.body.hash) {
    console.error('❌ chain link 1→2 broken');
    process.exit(1);
  }

  const log3 = await post('shift_close', { actualCash: 115 });
  if (log3.status !== 201 || log3.body.prevHash !== log2.body.hash) {
    console.error('❌ chain link 2→3 broken');
    process.exit(1);
  }

  const getRes = await fetch(`${BASE}/api/audit?limit=500`);
  const getBody = await getRes.json();
  const logsList = getBody.items ?? getBody;

  if (getRes.status !== 200 || !Array.isArray(logsList) || logsList.length < 3) {
    console.error('❌ GET audit list failed', getRes.status, logsList?.length);
    process.exit(1);
  }

  const asc = [...logsList].sort(
    (a: { timestamp: string }, b: { timestamp: string }) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  const tail = asc.slice(-3);
  for (let i = 1; i < tail.length; i++) {
    if (tail[i].prevHash !== tail[i - 1].hash) {
      console.error(`❌ broken link in last 3 logs at index ${i}`);
      process.exit(1);
    }
  }

  console.log('✅ cryptographic audit log chain verified');
  await disconnectDb();
  console.log('--- Legacy Audit Trail Integration Test Passed ---');
}

main().catch(async (err) => {
  console.error(err);
  await disconnectDb().catch(() => {});
  process.exit(1);
});
