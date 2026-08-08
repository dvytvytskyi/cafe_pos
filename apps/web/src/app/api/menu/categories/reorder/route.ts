import { NextResponse } from 'next/server';
import { menuRepository } from '@/repositories/menu.repository';
import { MenuValidationError } from '@/lib/menu-validation';

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const orderedIds = body.orderedIds;

    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return NextResponse.json({ error: 'orderedIds array is required' }, { status: 400 });
    }
    if (!orderedIds.every((id) => typeof id === 'string' && id.trim())) {
      return NextResponse.json({ error: 'orderedIds must be non-empty strings' }, { status: 400 });
    }

    await menuRepository.reorderCategories(orderedIds);
    return NextResponse.json({ ok: true, orderedIds }, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof MenuValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error reordering menu categories:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
