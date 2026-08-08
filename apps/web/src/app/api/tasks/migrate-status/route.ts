import { NextResponse } from 'next/server';
import { taskRepository } from '@/repositories/task.repository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { from, to } = body;

    if (!from || typeof from !== 'string' || !to || typeof to !== 'string') {
      return NextResponse.json({ error: 'from and to status ids are required' }, { status: 400 });
    }

    if (from === to) {
      return NextResponse.json({ migrated: 0 }, { status: 200 });
    }

    const migrated = await taskRepository.migrateStatus(from, to);
    return NextResponse.json({ migrated }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error migrating task statuses:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
