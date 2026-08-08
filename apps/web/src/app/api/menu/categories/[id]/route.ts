import { NextResponse } from 'next/server';
import {
  menuRepository,
  CategoryHasActiveItemsError,
} from '@/repositories/menu.repository';
import { MenuValidationError, validateCategoryName } from '@/lib/menu-validation';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const name = validateCategoryName(body.name);

    const updated = await menuRepository.updateCategory(id, name);
    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof MenuValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error updating menu category:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get('mode') === 'block' ? 'block' : 'cascade';

    const archived = await menuRepository.deleteCategory(id, mode);
    return NextResponse.json(archived, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof CategoryHasActiveItemsError) {
      return NextResponse.json(
        { error: 'Cannot delete category with active menu items' },
        { status: 409 }
      );
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error deleting menu category:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
