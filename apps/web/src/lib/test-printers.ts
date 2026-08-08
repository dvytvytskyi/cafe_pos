/**
 * Module 26 — printers CRUD + test print integration
 */
import { prisma, disconnectDb } from './db.ts';

const BASE = 'http://localhost:3000';
const PREFIX = 'M26-Integration';

async function cleanup() {
  await prisma.printer.deleteMany({ where: { name: { startsWith: PREFIX } } });
}

async function main() {
  console.log('--- Module 26 Printers Integration Tests ---');
  await cleanup();

  const bad = await fetch(`${BASE}/api/printers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Bad', ipAddress: 'not-an-ip', type: 'kitchen' }),
  });
  if (bad.status !== 400) {
    console.error('❌ invalid IP expected 400, got', bad.status);
    process.exit(1);
  }
  console.log('✅ invalid IP → 400');

  const createRes = await fetch(`${BASE}/api/printers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: `${PREFIX} Test Kitchen`,
      ipAddress: '192.168.99.50',
      port: 9100,
      type: 'kitchen',
    }),
  });
  const created = await createRes.json();
  if (createRes.status !== 201 || !created.id) {
    console.error('❌ create failed', createRes.status, created);
    process.exit(1);
  }
  console.log('✅ POST /api/printers → 201');

  const listRes = await fetch(`${BASE}/api/printers`);
  const list = await listRes.json();
  if (!Array.isArray(list) || !list.some((p: { id: string }) => p.id === created.id)) {
    console.error('❌ GET list missing created printer');
    process.exit(1);
  }
  console.log('✅ GET /api/printers includes new printer');

  const timeoutRes = await fetch(`${BASE}/api/printers/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ip: '192.168.254.254', port: 9100 }),
  });
  if (timeoutRes.status !== 504) {
    const body = await timeoutRes.json();
    console.error('❌ unreachable printer expected 504, got', timeoutRes.status, body);
    process.exit(1);
  }
  console.log('✅ T26.7 TCP test print timeout → 504');

  const delRes = await fetch(`${BASE}/api/printers/${created.id}`, { method: 'DELETE' });
  if (delRes.status !== 200) {
    console.error('❌ DELETE failed', delRes.status);
    process.exit(1);
  }
  console.log('✅ DELETE /api/printers/[id] → 200');

  await cleanup();
  await disconnectDb();
  console.log('--- Module 26 Printers Integration Tests Passed ---');
}

main().catch(async (err) => {
  console.error(err);
  await cleanup().catch(() => {});
  await disconnectDb().catch(() => {});
  process.exit(1);
});
