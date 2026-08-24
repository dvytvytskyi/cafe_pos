import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';
import { parseOrderHistoryFilters, OrderHistoryValidationError } from '@/lib/order-history-validation';
import { getSessionFromRequest } from '@/lib/auth';
import {
  resolveScopedLocationId,
  resolveLocationIdsForAllQuery,
} from '@/lib/location-scope';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';
import { apiErrorResponse } from '@/lib/api-route-errors';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const session = getSessionFromRequest(req);
    const rawLocationId = searchParams.get('locationId') || DEFAULT_LOCATION_ID;
    const status = searchParams.get('status') || 'active';

    if (status === 'active') {
      const fresh = searchParams.get('fresh') === '1';

      if (session && rawLocationId === 'all') {
        const scopedIds = resolveLocationIdsForAllQuery(session, DEFAULT_LOCATION_ID);
        if (scopedIds !== 'all') {
          const batches = await Promise.all(
            scopedIds.map((id) => orderService.getActiveOrders(id, { bypassCache: fresh }))
          );
          const byId = new Map<string, (typeof batches)[0][0]>();
          for (const batch of batches) {
            for (const order of batch) byId.set(order.id, order);
          }
          return NextResponse.json([...byId.values()], { status: 200 });
        }
      }

      const locationId = session
        ? resolveScopedLocationId(session, rawLocationId, DEFAULT_LOCATION_ID)
        : rawLocationId;
      const orders = await orderService.getActiveOrders(
        locationId === 'all' ? 'all' : locationId,
        { bypassCache: fresh }
      );
      return NextResponse.json(orders, { status: 200 });
    }

    const filters = parseOrderHistoryFilters(searchParams);
    if (session) {
      filters.locationId = resolveScopedLocationId(session, filters.locationId, DEFAULT_LOCATION_ID);
    }
    const result = await orderService.getOrderHistory(filters);
    return NextResponse.json(result.orders, { status: 200 });
  } catch (error: unknown) {
    if (error instanceof OrderHistoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiErrorResponse(error, { logLabel: 'Error fetching orders:' });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const created = await orderService.createOrder({
      id: body.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
      locationId: body.locationId || DEFAULT_LOCATION_ID,
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
      discountType: body.discountType,
      tipType: body.tipType,
      tipValue: body.tipValue,
      guestCount: body.guestCount,
      takenByStaffId: body.takenByStaffId,
      servedByStaffId: body.servedByStaffId,
      assignedStaffId: body.assignedStaffId,
      pointsToSpend: body.pointsToSpend,
      isPrepaid: body.isPrepaid,
    } as any);

    return NextResponse.json(created, { status: 201 });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
