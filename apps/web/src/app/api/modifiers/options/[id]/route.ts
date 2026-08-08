import { NextResponse } from 'next/server';
import { modifierRepository } from '@/repositories/modifier.repository';
import { ModifierValidationError } from '@/lib/modifier-validation';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await modifierRepository.updateOption(id, body);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof ModifierValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating modifier option:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const archived = await modifierRepository.updateOption(id, { isArchived: true });
    return NextResponse.json(archived);
  } catch (error: unknown) {
    console.error('Error archiving modifier option:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
