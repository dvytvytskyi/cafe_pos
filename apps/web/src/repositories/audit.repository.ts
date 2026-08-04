import { prisma } from '../lib/db';
import { createHash } from 'crypto';

export class AuditRepository {
  async getLogs() {
    return prisma.auditLog.findMany({
      orderBy: { createdAt: 'asc' },
    });
  }

  async logEvent(action: string, details: any = {}) {
    // 1. Fetch latest log to get its hash
    const lastEntry = await prisma.auditLog.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    const prevHash = lastEntry ? lastEntry.hash : '0000000000000000';
    const timestamp = new Date().toISOString();

    // 2. Compute secure SHA-256 hash
    const hashPayload = JSON.stringify({
      action,
      details,
      prevHash,
      timestamp,
    });

    const hash = createHash('sha256').update(hashPayload).digest('hex');

    // 3. Create entry in DB
    return prisma.auditLog.create({
      data: {
        action,
        details,
        prevHash,
        hash,
      },
    });
  }
}

export const auditRepository = new AuditRepository();
