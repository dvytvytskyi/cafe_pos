import type { AuditAction } from './audit-validation';

export interface AuditEntry {
  id: string;
  timestamp: Date;
  action: AuditAction | string;
  details: Record<string, unknown> | null;
  userId?: string | null;
  prevHash: string;
  hash: string;
}

export type AuditLogsPage = {
  items: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
};

export type AuditLogFilters = {
  action?: string;
  userId?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
};

export class AuditApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuditApiError';
    this.status = status;
  }
}

function mapApiLog(log: {
  id: string;
  timestamp: string | Date;
  action: string;
  details: Record<string, unknown> | null;
  userId?: string | null;
  prevHash: string;
  hash: string;
}): AuditEntry {
  return {
    id: log.id,
    timestamp: new Date(log.timestamp),
    action: log.action,
    details: log.details,
    userId: log.userId ?? null,
    prevHash: log.prevHash,
    hash: log.hash,
  };
}

export async function getAuditLogsAsync(filters: AuditLogFilters = {}): Promise<AuditLogsPage> {
  const params = new URLSearchParams();
  if (filters.action) params.set('action', filters.action);
  if (filters.userId) params.set('userId', filters.userId);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));

  const qs = params.toString();
  const res = await fetch(`/api/audit${qs ? `?${qs}` : ''}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AuditApiError(body.error ?? 'Failed to fetch audit logs', res.status);
  }

  if (Array.isArray(body)) {
    return {
      items: body.map(mapApiLog),
      total: body.length,
      limit: body.length,
      offset: 0,
    };
  }

  return {
    items: (body.items ?? []).map(mapApiLog),
    total: body.total ?? 0,
    limit: body.limit ?? 100,
    offset: body.offset ?? 0,
  };
}

export async function logAuditEventAsync(
  action: string,
  details: Record<string, unknown> = {},
  userId?: string
): Promise<AuditEntry> {
  const res = await fetch('/api/audit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, details, userId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new AuditApiError(body.error ?? 'Failed to create audit log entry', res.status);
  }
  return mapApiLog(body);
}

/** Fire-and-forget DB audit write (sync call sites stay compatible). */
export function logAuditEvent(
  action: string,
  details: Record<string, unknown> = {},
  userId?: string
): void {
  logAuditEventAsync(action, details, userId).catch(console.error);
}
