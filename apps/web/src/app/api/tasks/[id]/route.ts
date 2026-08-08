import { NextResponse } from 'next/server';
import { taskRepository, InvalidAssigneeError, InactiveAssigneeError } from '@/repositories/task.repository';
import { validateTaskTitle } from '@/lib/task-validation';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const task = await taskRepository.findById(id);
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json(task, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching task:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (body.title !== undefined) {
      if (typeof body.title !== 'string') {
        return NextResponse.json({ error: 'title must be a string' }, { status: 400 });
      }
      const titleCheck = validateTaskTitle(body.title);
      if (!titleCheck.valid) {
        return NextResponse.json({ error: titleCheck.error }, { status: 400 });
      }
    }

    const updated = await taskRepository.update(id, body);
    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    if (error instanceof InvalidAssigneeError) {
      return NextResponse.json({ error: 'Invalid assigneeId: user not found' }, { status: 400 });
    }
    if (error instanceof InactiveAssigneeError) {
      return NextResponse.json({ error: 'Cannot assign inactive staff member' }, { status: 400 });
    }
    if (error.message?.includes('not found')) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    console.error('Error updating task:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ok = await taskRepository.delete(id);
    if (!ok) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
