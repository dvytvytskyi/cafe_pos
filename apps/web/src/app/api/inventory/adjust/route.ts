import { NextResponse } from 'next/server';
import {
  inventoryRepository,
  InsufficientStockError,
} from '@/repositories/inventory.repository';
import { InventoryValidationError } from '@/lib/inventory-validation';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, type, quantity, reason } = body;

    if (!itemId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: itemId and type are required' },
        { status: 400 }
      );
    }

    if (type !== 'check_in' && type !== 'check_out') {
      return NextResponse.json(
        { error: 'Invalid adjustment type. Must be "check_in" or "check_out"' },
        { status: 400 }
      );
    }

    const updatedItem = await inventoryRepository.adjustStock(
      itemId,
      type,
      quantity,
      reason,
      typeof body.locationId === 'string' ? body.locationId : undefined
    );
    return NextResponse.json(updatedItem, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof InventoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error('Error adjusting inventory stock:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
