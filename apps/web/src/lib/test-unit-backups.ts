/**
 * Module 30 — backup validation unit tests
 */
import assert from 'assert';
import {
  formatBackupFilename,
  getExpiredBackups,
  isValidBackupFilename,
} from './backup-validation.ts';

export async function run() {
  console.log('--- Module 30 Backups Unit Tests ---');

  const name = formatBackupFilename(new Date('2026-08-08T14:30:00'));
  console.log('✅ T30.1 filename format backup_YYYY-MM-DD_HH-mm-ss');
  assert.match(name, /^backup_2026-08-08_14-30-00\.dump$/);
  assert.strictEqual(isValidBackupFilename(name), true);
  assert.strictEqual(isValidBackupFilename('backup_bad_name.dump'), false);
  assert.strictEqual(isValidBackupFilename('corgi_pos_backup_2026.dump'), true);

  const now = new Date('2026-08-04T00:00:00Z');
  const files = [
    { filename: 'backup-recent.dump', createdAt: new Date('2026-08-02T00:00:00Z') },
    { filename: 'backup-old.dump', createdAt: new Date('2026-06-01T00:00:00Z') },
  ];
  const expired = getExpiredBackups(files, 30, now);
  assert.strictEqual(expired.length, 1);
  assert.strictEqual(expired[0]!.filename, 'backup-old.dump');
  console.log('✅ retention expiry helper');

  console.log('--- Module 30 Unit Tests Passed ---');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
