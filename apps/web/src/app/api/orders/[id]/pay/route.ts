import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const updated = await orderService.completePayment(id, body);
    return NextResponse.json(updated, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Payment failed';
    console.error(`Error completing payment for order [${id}]:`, error);
    const clientError =
      message.includes('not found') ||
      message.includes('Insufficient') ||
      message.includes('already paid') ||
      message.includes('required') ||
      message.includes('Gift Card') ||
      message.includes('must be greater');
    return NextResponse.json(
      { error: message },
      { status: clientError ? 400 : 500 }
    );
  }
}
