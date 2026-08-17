import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get('customerId') || undefined;
    const balance = await orderService.getLoyaltyBalance(id, customerId);
    return NextResponse.json(balance, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load loyalty balance';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (!body.customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }
    const points = Number(body.pointsToSpend ?? 0);
    const order = await orderService.applyLoyaltyPoints(id, body.customerId, points);
    return NextResponse.json(order, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to apply points';
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
