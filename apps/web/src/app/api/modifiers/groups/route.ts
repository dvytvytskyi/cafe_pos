import { NextResponse } from 'next/server';
import { modifierRepository } from '@/repositories/modifier.repository';
import { ModifierValidationError } from '@/lib/modifier-validation';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const groups = await modifierRepository.getGroups(includeArchived);
    return NextResponse.json(groups);
  } catch (error: unknown) {
    console.error('Error fetching modifier groups:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, minQty, maxQty, options, categoryIds } = body;
    if (!name) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }
    const created = await modifierRepository.createGroup({
      name,
      minQty,
      maxQty,
      options,
      categoryIds,
    });
    return NextResponse.json(created, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof ModifierValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating modifier group:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
