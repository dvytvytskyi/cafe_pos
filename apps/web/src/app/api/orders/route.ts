import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const locationId = searchParams.get('locationId') || 'default';
    const orders = await orderService.getActiveOrders(locationId);
    return NextResponse.json(orders, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching orders:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const created = await orderService.createOrder({
      id: body.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      locationId: body.locationId || 'default',
      source: body.source || 'dine_in',
      status: body.status || 'preparing',
      paymentStatus: body.paymentStatus || (body.paid ? 'paid' : 'unpaid'),
      total: body.total || 0,
      customerName: body.customerName || 'Walk-in Customer',
      customerId: body.customerId || undefined,
      tableId: body.tableId || undefined,
      items: body.items || [],
      discountName: body.discountName,
      discountValue: body.discountValue,
    } as any);

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
