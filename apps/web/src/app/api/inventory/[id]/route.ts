import { NextResponse } from 'next/server';
import {
  inventoryRepository,
  InsufficientStockError,
} from '@/repositories/inventory.repository';
import { InventoryValidationError } from '@/lib/inventory-validation';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updated = await inventoryRepository.updateItem(id, body);
    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof InventoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating inventory item:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function GET(_req: Request, { params }: RouteParams) {
  try {
    const { id } = await params;
    const items = await inventoryRepository.getItems(false);
    const item = items.find((i) => i.id === id);
    if (!item) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(item, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching inventory item:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
