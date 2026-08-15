import { NextResponse } from 'next/server';
import { orderService } from '@/services/order.service';
import {
  OrderHistoryValidationError,
  parseOrderHistoryFilters,
} from '@/lib/order-history-validation';

function formatHistoryOrder(order: {
  id: string;
  orderNumber: string;
  source?: string;
  customerName?: string;
  status: string;
  total: number;
  paid?: boolean;
  amountPaid?: number;
  refundedAmount?: number;
  createdAt: Date;
  tableId?: string;
  tableNumber?: string | null;
  waiterName?: string | null;
  items: unknown[];
  payments?: Array<{ method: string; amount: number; code?: string }>;
  discountName?: string;
  discountValue?: number;
  locationId: string;
  customerId?: string;
}) {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    source: order.source,
    customerName: order.customerName,
    status: order.status,
    total: order.total,
    paid: order.paid,
    paymentStatus: order.paid ? 'paid' : 'unpaid',
    amountPaid: order.amountPaid,
    refundedAmount: order.refundedAmount ?? 0,
    createdAt: order.createdAt,
    tableId: order.tableId,
    tableNumber: order.tableNumber ?? null,
    waiterName: order.waiterName ?? null,
    locationId: order.locationId,
    customerId: order.customerId,
    customerPointsEarned: (order as { customerPointsEarned?: number }).customerPointsEarned,
    items: order.items,
    transactions: order.payments ?? [],
    discountName: order.discountName,
    discountValue: order.discountValue,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filters = parseOrderHistoryFilters(searchParams);
    const result = await orderService.getOrderHistory(filters);
    return NextResponse.json(
      {
        orders: result.orders.map(formatHistoryOrder),
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    if (error instanceof OrderHistoryValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('GET /api/orders/history error:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: message }, { status: 500 });
  }
}
