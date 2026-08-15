import { NextResponse } from 'next/server';
import { checklistRepository } from '@/repositories/checklist.repository';
import { isValidShiftType } from '@/lib/checklist-locations';

type TemplateInput = {
  taskKey: string;
  title: string;
  requiresPhoto: boolean;
  category: string;
  sortOrder: number;
  permissions: Record<string, boolean>;
};

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const templates = body.templates as TemplateInput[] | undefined;

    if (!Array.isArray(templates)) {
      return NextResponse.json({ error: 'templates array is required' }, { status: 400 });
    }

    for (const template of templates) {
      if (!template.taskKey || !template.title || !isValidShiftType(template.category)) {
        return NextResponse.json({ error: 'Invalid template payload' }, { status: 400 });
      }
    }

    const saved = await checklistRepository.replaceTemplates(templates);
    return NextResponse.json({ templates: saved }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error saving checklist templates:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
