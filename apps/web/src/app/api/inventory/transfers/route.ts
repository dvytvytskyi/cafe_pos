import { NextResponse } from 'next/server';
import {
  inventoryRepository,
  InsufficientStockError,
} from '@/repositories/inventory.repository';
import { InventoryValidationError } from '@/lib/inventory-validation';

export async function GET() {
  try {
    const transfers = await inventoryRepository.getStockTransfers();
    return NextResponse.json(transfers, { status: 200 });
  } catch (error: unknown) {
    console.error('Error fetching stock transfers:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const transfer = await inventoryRepository.createStockTransfer(body);
    return NextResponse.json(transfer, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof InventoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof InsufficientStockError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: 400 });
    }
    console.error('Error creating stock transfer:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
