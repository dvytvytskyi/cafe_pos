import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const { itemId, portions } = body;
    if (!itemId || !Array.isArray(portions) || portions.length < 2) {
      return NextResponse.json(
        { error: 'itemId and portions[] (min 2) are required' },
        { status: 400 },
      );
    }
    const items = await orderService.splitOrderItem(id, itemId, portions);
    return NextResponse.json({ items }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Split failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
