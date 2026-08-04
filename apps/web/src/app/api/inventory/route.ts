import { NextResponse } from 'next/server';
import { inventoryRepository } from '@/repositories/inventory.repository';

export async function GET() {
  try {
    const items = await inventoryRepository.getItems();
    return NextResponse.json(items, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching merch inventory:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, sku, price, initialStock } = body;

    if (!name || !sku || price === undefined) {
      return NextResponse.json({ error: 'Missing required fields: name, sku, and price are required' }, { status: 400 });
    }

    const createdItem = await inventoryRepository.createItem({
      name,
      sku,
      price,
      initialStock,
    });

    return NextResponse.json(createdItem, { status: 201 });

  } catch (error: any) {
    console.error('Error creating inventory item:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
