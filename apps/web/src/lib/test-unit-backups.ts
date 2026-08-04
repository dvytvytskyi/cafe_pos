import assert from 'assert';

interface BackupFile {
  name: string;
  createdAt: Date;
}

function getExpiredBackups(files: BackupFile[], retentionDays: number = 30, now: Date = new Date()): BackupFile[] {
  const cutoffTime = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  return files.filter(f => f.createdAt.getTime() < cutoffTime);
}

export async function run() {
  console.log('Running test-unit-backups...');

  const now = new Date('2026-08-04T00:00:00Z');
  const files: BackupFile[] = [
    { name: 'backup-recent.sql', createdAt: new Date('2026-08-02T00:00:00Z') }, // 2 days old (keep)
    { name: 'backup-old.sql', createdAt: new Date('2026-06-01T00:00:00Z') }    // ~64 days old (delete)
  ];

  const expired = getExpiredBackups(files, 30, now);

  assert.strictEqual(expired.length, 1, 'Expired backups count should be 1');
  assert.strictEqual(expired[0].name, 'backup-old.sql', 'Should mark the 64-day-old backup for deletion');

  console.log('✅ test-unit-backups passed.');
}
