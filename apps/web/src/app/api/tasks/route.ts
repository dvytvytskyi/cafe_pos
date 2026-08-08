import { NextResponse } from 'next/server';
import { taskRepository, InvalidAssigneeError, InactiveAssigneeError } from '@/repositories/task.repository';
import { isValidDateParam } from '@/lib/task-dates';
import { validateTaskTitle } from '@/lib/task-validation';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? undefined;
    const assigneeId = searchParams.get('assigneeId') ?? undefined;
    const status = searchParams.get('status') ?? undefined;

    if (date && !isValidDateParam(date)) {
      return NextResponse.json(
        { error: 'Invalid date format. Expected YYYY-MM-DD.' },
        { status: 400 }
      );
    }

    const tasks = await taskRepository.findAll({ date, assigneeId, status });
    return NextResponse.json(tasks, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, status = 'todo' } = body;

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'title is required' }, { status: 400 });
    }

    const titleCheck = validateTaskTitle(title);
    if (!titleCheck.valid) {
      return NextResponse.json({ error: titleCheck.error }, { status: 400 });
    }

    const created = await taskRepository.create({
      ...body,
      title,
      status,
      assignees: body.assignees ?? body.assigneeIds ?? [],
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    if (error instanceof InvalidAssigneeError) {
      return NextResponse.json({ error: 'Invalid assigneeId: user not found' }, { status: 400 });
    }
    if (error instanceof InactiveAssigneeError) {
      return NextResponse.json({ error: 'Cannot assign inactive staff member' }, { status: 400 });
    }
    console.error('Error creating task:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
