export const BACKUP_FILENAME_RE =
  /^backup_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.(dump|sql)$/;

export const LEGACY_BACKUP_FILENAME_RE = /^corgi_pos_backup_.+\.(dump|sql)$/;

export const DEFAULT_RETENTION_DAYS = 30;

export class BackupValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupValidationError';
  }
}

export function formatBackupFilename(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const y = date.getFullYear();
  const m = pad(date.getMonth() + 1);
  const d = pad(date.getDate());
  const h = pad(date.getHours());
  const min = pad(date.getMinutes());
  const s = pad(date.getSeconds());
  return `backup_${y}-${m}-${d}_${h}-${min}-${s}.dump`;
}

export function isValidBackupFilename(name: string): boolean {
  return BACKUP_FILENAME_RE.test(name) || LEGACY_BACKUP_FILENAME_RE.test(name);
}

export type BackupFileMeta = {
  filename: string;
  createdAt: Date;
};

export function getExpiredBackups(
  files: BackupFileMeta[],
  retentionDays = DEFAULT_RETENTION_DAYS,
  now = new Date()
): BackupFileMeta[] {
  const cutoff = now.getTime() - retentionDays * 24 * 60 * 60 * 1000;
  return files.filter((f) => f.createdAt.getTime() < cutoff);
}
