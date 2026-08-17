import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const items = Array.isArray(body.items) ? body.items : [body];
    if (items.length === 0) {
      return NextResponse.json({ error: 'At least one item is required' }, { status: 400 });
    }
    const result = await orderService.addOrderItems(id, items);
    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add items';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
