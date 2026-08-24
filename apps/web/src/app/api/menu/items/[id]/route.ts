import { NextResponse } from 'next/server';
import { menuRepository } from '@/repositories/menu.repository';
import { auditRepository } from '@/repositories/audit.repository';
import { MenuValidationError } from '@/lib/menu-validation';
import { GUEST_SUPPORTED_LOCALES } from '@/lib/guest-constants';

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const item = await menuRepository.getMenuItem(id);
    if (!item) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }
    return NextResponse.json(item, { status: 200 });
  } catch (error: unknown) {
    console.error(`Error fetching menu item:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      name,
      description,
      price,
      categoryId,
      allergens,
      isArchived,
      imageUrl,
      tags,
      isVisible,
      locationIds,
    } = body;

    const updatedItem = await menuRepository.updateMenuItem(id, {
      name,
      description,
      price,
      categoryId,
      allergens,
      isArchived,
      imageUrl,
      tags: Array.isArray(tags) ? tags : undefined,
      isVisible: typeof isVisible === 'boolean' ? isVisible : undefined,
      locationIds: Array.isArray(locationIds) ? locationIds : undefined,
    });

    return NextResponse.json(updatedItem, { status: 200 });

  } catch (error: unknown) {
    if (error instanceof MenuValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error(`Error updating menu item [${req.url}]:`, error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const archivedItem = await menuRepository.archiveMenuItem(id);
    await auditRepository.logEvent('menu_item_archived', {
      itemId: id,
      name: archivedItem.name,
      categoryId: archivedItem.categoryId,
    });
    return NextResponse.json(archivedItem, { status: 200 });
  } catch (error: any) {
    console.error(`Error archiving menu item:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
