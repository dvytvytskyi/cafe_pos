import { NextResponse } from 'next/server';
import { menuRepository } from '@/repositories/menu.repository';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { name, description, price, categoryId, allergens } = body;

    const updatedItem = await menuRepository.updateMenuItem(id, {
      name,
      description,
      price,
      categoryId,
      allergens,
    });

    return NextResponse.json(updatedItem, { status: 200 });

  } catch (error: any) {
    console.error(`Error updating menu item [${req.url}]:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const archivedItem = await menuRepository.archiveMenuItem(id);
    return NextResponse.json(archivedItem, { status: 200 });
  } catch (error: any) {
    console.error(`Error archiving menu item:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
