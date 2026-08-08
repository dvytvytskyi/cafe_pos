import { NextResponse } from 'next/server';
import { modifierRepository } from '@/repositories/modifier.repository';
import { ModifierValidationError } from '@/lib/modifier-validation';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await modifierRepository.linkCategories(id, body.categoryIds ?? []);
    return NextResponse.json(updated);
  } catch (error: unknown) {
    if (error instanceof ModifierValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error linking modifier categories:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
