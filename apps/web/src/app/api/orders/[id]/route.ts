import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();

    const updated = await orderService.updateOrder(id, body);
    return NextResponse.json(updated, { status: 200 });
  } catch (error: any) {
    console.error(`Error updating order [${id}]:`, error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
