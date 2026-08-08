import { NextResponse } from 'next/server';
import { modifierRepository } from '@/repositories/modifier.repository';
import { ModifierValidationError } from '@/lib/modifier-validation';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, price } = body;
    if (!name || price === undefined) {
      return NextResponse.json({ error: 'name and price are required' }, { status: 400 });
    }
    const created = await modifierRepository.addOption(id, { name, price });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ModifierValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error adding modifier option:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
