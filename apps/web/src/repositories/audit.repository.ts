import { prisma } from '../lib/db.ts';
import { createHash } from 'crypto';
import type { AuditLogFilters } from '../lib/audit-validation.ts';

export type AuditLogRecord = {
  id: string;
  action: string;
  details: unknown;
  userId: string | null;
  prevHash: string;
  hash: string;
  createdAt: Date;
};

function mapRow(row: {
  id: string;
  action: string;
  details: unknown;
  userId: string | null;
  prevHash: string;
  hash: string;
  createdAt: Date;
}): AuditLogRecord {
  return {
    id: row.id,
    action: row.action,
    details: row.details,
    userId: row.userId,
    prevHash: row.prevHash,
    hash: row.hash,
    createdAt: row.createdAt,
  };
}

export class AuditRepository {
  /** Append-only ledger — no update/delete methods by design (T29.1). */
  async findLogs(filters: AuditLogFilters = {}): Promise<{ items: AuditLogRecord[]; total: number }> {
    const where: {
      action?: string;
      userId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = {};

    if (filters.action) where.action = filters.action;
    if (filters.userId) where.userId = filters.userId;
    if (filters.from || filters.to) {
      where.createdAt = {};
      if (filters.from) where.createdAt.gte = filters.from;
      if (filters.to) where.createdAt.lte = filters.to;
    }

    const limit = filters.limit ?? 100;
    const offset = filters.offset ?? 0;

    const [rows, total] = await prisma.$transaction([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return { items: rows.map(mapRow), total };
  }

  async logEvent(action: string, details: unknown = {}, userId?: string | null) {
    const lastEntry = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const prevHash = lastEntry ? lastEntry.hash : '0000000000000000';
    const timestamp = new Date().toISOString();

    const hashPayload = JSON.stringify({
      action,
      details,
      prevHash,
      timestamp,
      userId: userId ?? null,
    });

    const hash = createHash('sha256').update(hashPayload).digest('hex');

    return prisma.auditLog.create({
      data: {
        action,
        details: details as object,
        userId: userId ?? null,
        prevHash,
        hash,
      },
    });
  }
}

export const auditRepository = new AuditRepository();
