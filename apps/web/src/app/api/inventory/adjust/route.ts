import { NextResponse } from 'next/server';
import { inventoryRepository } from '@/repositories/inventory.repository';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { itemId, type, quantity, reason } = body;

    if (!itemId || !type || quantity === undefined) {
      return NextResponse.json({ error: 'Missing required fields: itemId, type, and quantity are required' }, { status: 400 });
    }

    if (type !== 'check_in' && type !== 'check_out') {
      return NextResponse.json({ error: 'Invalid adjustment type. Must be "check_in" or "check_out"' }, { status: 400 });
    }

    const updatedItem = await inventoryRepository.adjustStock(
      itemId,
      type,
      quantity,
      reason
    );

    return NextResponse.json(updatedItem, { status: 200 });

  } catch (error: any) {
    console.error('Error adjusting inventory stock:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
