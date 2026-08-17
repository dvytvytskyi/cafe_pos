import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (!body.email) {
      return NextResponse.json({ error: 'email is required' }, { status: 400 });
    }
    const result = await orderService.sendReceiptEmail(id, body.email, body.includeFiscal !== false);
    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to send receipt';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
