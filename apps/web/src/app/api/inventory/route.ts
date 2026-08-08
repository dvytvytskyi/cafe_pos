import { NextResponse } from 'next/server';
import {
  inventoryRepository,
  InsufficientStockError,
} from '@/repositories/inventory.repository';
import { InventoryValidationError } from '@/lib/inventory-validation';

export async function GET() {
  try {
    const items = await inventoryRepository.getItems();
    return NextResponse.json(items, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching merch inventory:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const createdItem = await inventoryRepository.createItem(body);
    return NextResponse.json(createdItem, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof InventoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error creating inventory item:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
