import { NextResponse } from 'next/server';
import { inventoryRepository } from '@/repositories/inventory.repository';
import { InventoryValidationError, validateTransferStatus } from '@/lib/inventory-validation';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const status = validateTransferStatus(body.status);
    const transfer = await inventoryRepository.updateStockTransferStatus(id, status);
    return NextResponse.json(transfer, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof InventoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error('Error updating stock transfer:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
