export type BackupFile = {
  filename: string;
  sizeBytes: number;
  createdAt: string;
};

export type CreateBackupResult = {
  filename: string;
  sizeBytes: number;
  uploadedToS3: boolean;
};

export class BackupsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'BackupsApiError';
    this.status = status;
  }
}

export async function listBackupsAsync(): Promise<BackupFile[]> {
  const res = await fetch('/api/backups');
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new BackupsApiError(body.error ?? 'Failed to list backups', res.status);
  }
  return body;
}

export async function createBackupAsync(options?: { queue?: boolean }): Promise<CreateBackupResult | { queued: true }> {
  const res = await fetch('/api/backups', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ queue: options?.queue ?? false }),
  });
  const body = await res.json().catch(() => ({}));
  if (res.status === 202) {
    return { queued: true };
  }
  if (!res.ok) {
    throw new BackupsApiError(body.error ?? 'Failed to create backup', res.status);
  }
  return body;
}

export async function restoreBackupAsync(file: File): Promise<void> {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch('/api/backups/restore', { method: 'POST', body: form });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new BackupsApiError(body.error ?? 'Failed to restore backup', res.status);
  }
}

export function formatBackupSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
