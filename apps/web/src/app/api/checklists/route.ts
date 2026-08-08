import { NextResponse } from 'next/server';
import {
  checklistRepository,
  ChecklistValidationError,
  ShiftClosedError,
  ChecklistForbiddenError,
} from '@/repositories/checklist.repository';
import { isValidShiftType } from '@/lib/checklist-locations';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const shiftType = searchParams.get('shiftType');

    if (!date) {
      return NextResponse.json({ error: 'date is required (YYYY-MM-DD)' }, { status: 400 });
    }

    const templates = shiftType && isValidShiftType(shiftType)
      ? await checklistRepository.getTemplates(shiftType)
      : await checklistRepository.getTemplates();

    const completions =
      shiftType && isValidShiftType(shiftType)
        ? await checklistRepository.getCompletions(date, shiftType)
        : [];

    return NextResponse.json({ templates, completions }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof ChecklistValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error fetching checklists:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const saved = await checklistRepository.upsertCompletion(body);
    return NextResponse.json(saved, { status: 201 });
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
    console.error('Error saving checklist:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
