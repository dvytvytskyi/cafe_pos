import { NextResponse } from 'next/server';
import { fiscalService } from '@/services/fiscal.service';
import { mapToDomainOrder } from '@/repositories/order.repository';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const result = await fiscalService.processRefund(id, body);
    return NextResponse.json(
      { ...result, order: result.order ? mapToDomainOrder(result.order) : null },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Refund failed';
    console.error(`Error processing refund for order [${id}]:`, error);
    const clientError =
      message.includes('not found') ||
      message.includes('Invalid') ||
      message.includes('Cannot') ||
      message.includes('exceeds');
    return NextResponse.json({ error: message }, { status: clientError ? 400 : 500 });
  }
}
