import { NextResponse } from 'next/server';
import { auditRepository } from '@/repositories/audit.repository';

export async function GET() {
  try {
    const logs = await auditRepository.getLogs();
    const formattedLogs = logs.map(log => ({
      id: log.id,
      timestamp: log.createdAt,
      action: log.action,
      details: log.details,
      prevHash: log.prevHash,
      hash: log.hash,
    }));
    return NextResponse.json(formattedLogs, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, details } = body;

    if (!action) {
      return NextResponse.json({ error: 'Missing required field: action' }, { status: 400 });
    }

    const createdLog = await auditRepository.logEvent(action, details);

    return NextResponse.json({
      id: createdLog.id,
      timestamp: createdLog.createdAt,
      action: createdLog.action,
      details: createdLog.details,
      prevHash: createdLog.prevHash,
      hash: createdLog.hash,
    }, { status: 201 });

  } catch (error: any) {
    console.error('Error creating audit log entry:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
