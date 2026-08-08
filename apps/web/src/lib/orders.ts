import { mapApiOrderToUi, mapUiOrderToApi } from './mappers/order.mapper';
import { DEFAULT_LOCATION_ID } from './constants';

export type OrderSource = 'glovo' | 'ubereats' | 'dine_in' | 'takeaway';

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  paid?: boolean;
  comments?: string; // Phase 2: Kitchen comments
}

export interface Order {
  id: string;
  source: OrderSource;
  customerName: string;
  items: OrderItem[];
  total: number; // Final total including discounts and tips
  discount?: { name: string; value: number; amountDeducted: number };
  tip?: { type: 'percent' | 'fixed'; value: number; amountAdded: number };
  status: 'incoming' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  time: Date;
  deliveryId?: string;
  paid: boolean;
  amountPaid?: number;
  refundedAmount?: number;
  payments?: { method: 'card' | 'cash' | 'points' | 'giftcard'; amount: number; code?: string }[];
  orderedBy: 'waiter' | 'app';
  readyByTime?: string;
  customerEmail?: string;
  receiptsSentTo?: string[];
  customerId?: string;
  customerPointsPaid?: number;
  customerPointsEarned?: number;
  tableId?: string; // Phase 1: Linked table id
  orderNumber?: string;
  tableNumber?: string | null;
  waiterName?: string | null;
}

/** @deprecated Use getOrdersAsync or getOrderHistoryAsync — local cache removed. */
export const getOrders = (): Order[] => [];

/** @deprecated No-op — order state lives in PostgreSQL. */
export const saveOrders = (_orders: Order[]) => {};

export type OrderHistoryPage = {
  orders: Order[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

export class OrderHistoryApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'OrderHistoryApiError';
    this.status = status;
  }
}

export async function getOrderHistoryAsync(params?: {
  locationId?: string;
  page?: number;
  limit?: number;
  source?: OrderSource;
  startDate?: string;
  endDate?: string;
  paymentMethod?: string;
  query?: string;
}): Promise<OrderHistoryPage> {
  const qs = new URLSearchParams();
  qs.set('locationId', params?.locationId ?? DEFAULT_LOCATION_ID);
  if (params?.page) qs.set('page', String(params.page));
  if (params?.limit) qs.set('limit', String(params.limit));
  if (params?.source) qs.set('source', params.source);
  if (params?.startDate) qs.set('startDate', params.startDate);
  if (params?.endDate) qs.set('endDate', params.endDate);
  if (params?.paymentMethod) qs.set('paymentMethod', params.paymentMethod);
  if (params?.query) qs.set('query', params.query);

  const res = await fetch(`/api/orders/history?${qs.toString()}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new OrderHistoryApiError(body.error ?? 'Failed to fetch order history', res.status);
  }
  return {
    ...body,
    orders: (body.orders ?? []).map((o: Parameters<typeof mapApiOrderToUi>[0]) => mapApiOrderToUi(o) as Order),
  };
}

export async function getOrdersAsync(locationId: string = DEFAULT_LOCATION_ID): Promise<Order[]> {
  const res = await fetch(`/api/orders?locationId=${locationId}&status=active`);
  if (!res.ok) {
    throw new Error('Failed to fetch active orders from PostgreSQL');
  }
  const data = await res.json();
  return data.map((o) => mapApiOrderToUi(o) as Order);
}

export async function createOrderAsync(
  order: Partial<Order> & { items: OrderItem[]; tableId?: string; locationId?: string }
): Promise<Order> {
  const payload = mapUiOrderToApi({
    ...order,
    locationId: order.locationId || DEFAULT_LOCATION_ID,
    source: order.source || 'dine_in',
    status: order.status || 'preparing',
    items: order.items,
  });

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.details || 'Failed to create order in PostgreSQL');
  }
  return mapApiOrderToUi(await res.json()) as Order;
}

export async function updateOrderAsync(id: string, order: Partial<Order> & { items?: OrderItem[] }): Promise<Order> {
  const payload = order.items
    ? mapUiOrderToApi({
        ...order,
        items: order.items,
        locationId: DEFAULT_LOCATION_ID,
      })
    : order;

  const res = await fetch(`/api/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.details || `Failed to update order [${id}] in PostgreSQL`);
  }
  return mapApiOrderToUi(await res.json()) as Order;
}

/** @deprecated Use createOrderAsync */
export async function saveOrderAsync(order: Partial<Order>): Promise<Order> {
  return createOrderAsync(order as Partial<Order> & { items: OrderItem[] });
}

export async function updateOrderStatusAsync(id: string, status: string): Promise<Order> {
  const res = await fetch(`/api/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update order status for [${id}] in PostgreSQL`);
  }
  return mapApiOrderToUi(await res.json()) as Order;
}

export interface PayPayload {
  payments: { method: 'card' | 'cash' | 'points' | 'giftcard'; amount: number; code?: string }[];
  customerId?: string;
  discount?: { name: string; value: number };
  tip?: { type: 'percent' | 'fixed'; value: number };
  total?: number;
  paidItemIndexes?: number[];
}

export async function completePaymentAsync(
  orderId: string,
  payload: PayPayload
): Promise<Order & { warnings?: string[] }> {
  const res = await fetch(`/api/orders/${orderId}/pay`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.details || 'Payment failed');
  }
  const data = await res.json();
  const mapped = mapApiOrderToUi(data) as Order & { warnings?: string[] };
  if (data.warnings) mapped.warnings = data.warnings;
  return mapped;
}

