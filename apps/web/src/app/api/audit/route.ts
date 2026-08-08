import { NextResponse } from 'next/server';
import { auditRepository } from '@/repositories/audit.repository';
import { AuditValidationError, parseAuditFilters } from '@/lib/audit-validation';

function formatLog(log: {
  id: string;
  createdAt: Date;
  action: string;
  details: unknown;
  userId: string | null;
  prevHash: string;
  hash: string;
}) {
  return {
    id: log.id,
    timestamp: log.createdAt,
    action: log.action,
    details: log.details,
    userId: log.userId,
    prevHash: log.prevHash,
    hash: log.hash,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = parseAuditFilters(searchParams);
    const { items, total } = await auditRepository.findLogs(filters);
    return NextResponse.json(
      {
        items: items.map(formatLog),
        total,
        limit: filters.limit,
        offset: filters.offset,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof AuditValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, details, userId } = body;

    if (!action || typeof action !== 'string') {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
    }

    const createdLog = await auditRepository.logEvent(
      action,
      details ?? {},
      typeof userId === 'string' ? userId : null
    );

    return NextResponse.json(formatLog(createdLog), { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error creating audit log entry:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
