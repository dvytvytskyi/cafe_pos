import { NextResponse } from 'next/server';
import {
  checklistRepository,
  ChecklistValidationError,
  ShiftClosedError,
  ChecklistForbiddenError,
} from '@/repositories/checklist.repository';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const saved = await checklistRepository.patchCompletion(id, body);
    return NextResponse.json(saved, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ChecklistForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof ShiftClosedError) {
      return NextResponse.json({ error: 'Cash shift is closed' }, { status: 403 });
    }
    if (error instanceof ChecklistValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error patching checklist:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
