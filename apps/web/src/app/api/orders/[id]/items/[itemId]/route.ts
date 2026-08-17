import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string; itemId: string }> }) {
  const { id, itemId } = await params;
  try {
    const body = await req.json();
    const item = await orderService.updateOrderItem(id, itemId, body);
    return NextResponse.json(item, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update item';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
