/**
 * Module 30 — backups API integration tests
 */
import fs from 'fs';
import path from 'path';
import { getBackupDirectory } from './backup.ts';
import { isValidBackupFilename } from './backup-validation.ts';

const BASE = 'http://localhost:3000';

async function main() {
  console.log('--- Module 30 Backups Integration Tests ---');

  const createRes = await fetch(`${BASE}/api/backups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queue: false }),
  });
  const created = await createRes.json();
  if (createRes.status !== 201 || !created.filename || !isValidBackupFilename(created.filename)) {
    console.error('❌ POST /api/backups failed', createRes.status, created);
    process.exit(1);
  }
  console.log('✅ T30.2 pg_dump via API → file created');

  const filePath = path.join(getBackupDirectory(), created.filename);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).size <= 0) {
    console.error('❌ backup file missing or empty');
    process.exit(1);
  }
  console.log('✅ backup file exists on disk');

  const listRes = await fetch(`${BASE}/api/backups`);
  const list = await listRes.json();
  if (
    listRes.status !== 200 ||
    !Array.isArray(list) ||
    !list.some((b: { filename: string }) => b.filename === created.filename)
  ) {
    console.error('❌ GET /api/backups missing new file', listRes.status, list);
    process.exit(1);
  }
  console.log('✅ GET /api/backups lists new backup');

  const queueRes = await fetch(`${BASE}/api/backups`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queue: true }),
  });
  if (queueRes.status !== 202) {
    console.error('❌ queued backup expected 202', queueRes.status, await queueRes.text());
    process.exit(1);
  }
  console.log('✅ BullMQ db:backup job queued (202)');

  const badRestore = await fetch(`${BASE}/api/backups/restore`, { method: 'POST' });
  if (badRestore.status !== 400) {
    console.error('❌ restore without file expected 400');
    process.exit(1);
  }
  console.log('✅ restore validation without file → 400');

  console.log('--- Module 30 Backups Integration Tests Passed ---');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
