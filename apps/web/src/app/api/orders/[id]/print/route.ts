import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';
import type { PrintStation } from '@/services/order-print.service';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const station = (body.station || 'all') as PrintStation;
    const onlyUnsent = body.onlyUnsent !== false;
    const results = await orderService.printOrder(id, station, onlyUnsent);
    const allOk = results.length > 0 && results.every((r) => r.success);
    return NextResponse.json({ results, success: allOk }, { status: allOk ? 200 : 207 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Print failed';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
