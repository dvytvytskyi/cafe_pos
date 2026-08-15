import { mapApiOrderToUi, mapUiOrderToApi } from './mappers/order.mapper';
import { DEFAULT_LOCATION_ID } from './constants';
import { CapacitorBridge } from './capacitor-bridge';
import {
  offlineCompletePayment,
  offlineCreateOrder,
  offlineDetachOrderFromTable,
  offlineGetOrders,
  offlineUpdateOrder,
  offlineUpdateOrderStatus,
} from './orders-offline';
import { startPosOfflineSync } from './pos-offline-sync';

function isPosOfflineMode(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    CapacitorBridge.isNative() || process.env.NEXT_PUBLIC_POS_OFFLINE === 'true'
  );
}

let offlineSyncLocation: string | null = null;

function ensureOfflineSync(locationId: string): void {
  if (!isPosOfflineMode() || offlineSyncLocation === locationId) return;
  offlineSyncLocation = locationId;
  startPosOfflineSync(locationId).catch(console.error);
}

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
  loyaltyGuestIds?: string[];
  customerPointsPaid?: number;
  customerPointsEarned?: number;
  tableId?: string; // Phase 1: Linked table id
  orderNumber?: string;
  tableNumber?: string | null;
  waiterName?: string | null;
  updatedAt?: Date;
}

/** Resolved loyalty guest ids (array persisted, or legacy single customerId). */
export function getOrderLoyaltyGuestIds(
  order: Pick<Order, 'customerId' | 'loyaltyGuestIds'>
): string[] {
  if (order.loyaltyGuestIds && order.loyaltyGuestIds.length > 0) {
    return order.loyaltyGuestIds;
  }
  return order.customerId ? [order.customerId] : [];
}

export function withAddedLoyaltyGuest(
  order: Order,
  guestId: string,
  guestName?: string
): Order {
  const existing = getOrderLoyaltyGuestIds(order);
  if (existing.includes(guestId)) return order;
  const loyaltyGuestIds = [...existing, guestId];
  const isFirst = existing.length === 0;
  return {
    ...order,
    loyaltyGuestIds,
    customerId: order.customerId ?? guestId,
    customerName: isFirst ? (guestName ?? order.customerName) : order.customerName,
  };
}

export function withRemovedLoyaltyGuest(
  order: Order,
  guestId: string,
  nextGuestName?: string
): Order {
  const loyaltyGuestIds = getOrderLoyaltyGuestIds(order).filter((id) => id !== guestId);
  const nextPrimary = loyaltyGuestIds[0];
  const keepTableName =
    order.customerName?.startsWith('Table ') ? order.customerName : undefined;
  return {
    ...order,
    loyaltyGuestIds,
    customerId: nextPrimary,
    customerName: nextPrimary
      ? (keepTableName ?? nextGuestName ?? order.customerName)
      : (keepTableName ?? 'Walk-in'),
    customerPointsPaid: nextPrimary ? order.customerPointsPaid : undefined,
  };
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
  customerId?: string;
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
  if (params?.customerId) qs.set('customerId', params.customerId);

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

export async function getOrdersAsync(
  locationId: string = DEFAULT_LOCATION_ID,
  options?: { fresh?: boolean }
): Promise<Order[]> {
  if (isPosOfflineMode()) {
    ensureOfflineSync(locationId);
    if (!options?.fresh && typeof navigator !== 'undefined' && !navigator.onLine) {
      return offlineGetOrders(locationId);
    }
    try {
      const qs = new URLSearchParams({ locationId, status: 'active' });
      if (options?.fresh) qs.set('fresh', '1');
      const res = await fetch(`/api/orders?${qs.toString()}`);
      if (!res.ok) throw new Error('fetch failed');
      const data = await res.json();
      const orders = data.map((o: Parameters<typeof mapApiOrderToUi>[0]) => mapApiOrderToUi(o) as Order);
      const { offlineReplaceOrdersSnapshot } = await import('./orders-offline');
      await offlineReplaceOrdersSnapshot(locationId, orders);
      return orders;
    } catch {
      return offlineGetOrders(locationId);
    }
  }

  const qs = new URLSearchParams({ locationId, status: 'active' });
  if (options?.fresh) qs.set('fresh', '1');
  const res = await fetch(`/api/orders?${qs.toString()}`);
  if (!res.ok) {
    throw new Error('Failed to fetch active orders from PostgreSQL');
  }
  const data = await res.json();
  return data.map((o: Parameters<typeof mapApiOrderToUi>[0]) => mapApiOrderToUi(o) as Order);
}

export async function createOrderAsync(
  order: Partial<Order> & { items: OrderItem[]; tableId?: string; locationId?: string }
): Promise<Order> {
  const locationId = order.locationId || DEFAULT_LOCATION_ID;
  if (isPosOfflineMode()) {
    ensureOfflineSync(locationId);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return offlineCreateOrder(locationId, order);
    }
    try {
      const payload = mapUiOrderToApi({
        ...order,
        locationId,
        source: order.source || 'dine_in',
        status: order.status || 'preparing',
        items: order.items,
      });
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('create failed');
      return mapApiOrderToUi(await res.json()) as Order;
    } catch {
      return offlineCreateOrder(locationId, order);
    }
  }

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
  const locationId = DEFAULT_LOCATION_ID;
  if (isPosOfflineMode()) {
    ensureOfflineSync(locationId);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return offlineUpdateOrder(locationId, id, order);
    }
    try {
      const hasItems = Array.isArray(order.items) && order.items.length > 0;
      const payload = mapUiOrderToApi({
        ...order,
        ...(hasItems ? { items: order.items } : {}),
        locationId,
      });
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('update failed');
      return mapApiOrderToUi(await res.json()) as Order;
    } catch {
      return offlineUpdateOrder(locationId, id, order);
    }
  }

  const hasItems = Array.isArray(order.items) && order.items.length > 0;
  const payload = mapUiOrderToApi({
    ...order,
    ...(hasItems ? { items: order.items } : {}),
    locationId: DEFAULT_LOCATION_ID,
  });

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
  const locationId = DEFAULT_LOCATION_ID;
  if (isPosOfflineMode()) {
    ensureOfflineSync(locationId);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return offlineUpdateOrderStatus(locationId, id, status);
    }
    try {
      const res = await fetch(`/api/orders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('status update failed');
      return mapApiOrderToUi(await res.json()) as Order;
    } catch {
      return offlineUpdateOrderStatus(locationId, id, status);
    }
  }

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

/** Unlink a dine-in order from its table when the table is freed on the floor plan. */
export async function detachOrderFromTableAsync(orderId: string): Promise<Order> {
  const locationId = DEFAULT_LOCATION_ID;
  if (isPosOfflineMode()) {
    ensureOfflineSync(locationId);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return offlineDetachOrderFromTable(locationId, orderId);
    }
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId: null }),
      });
      if (!res.ok) throw new Error('detach failed');
      return mapApiOrderToUi(await res.json()) as Order;
    } catch {
      return offlineDetachOrderFromTable(locationId, orderId);
    }
  }

  const res = await fetch(`/api/orders/${orderId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tableId: null }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.details || `Failed to detach order [${orderId}] from table`);
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
  markCompleted?: boolean;
}

export async function completePaymentAsync(
  orderId: string,
  payload: PayPayload
): Promise<Order & { warnings?: string[] }> {
  const locationId = DEFAULT_LOCATION_ID;
  if (isPosOfflineMode()) {
    ensureOfflineSync(locationId);
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return offlineCompletePayment(locationId, orderId, payload);
    }
    try {
      const res = await fetch(`/api/orders/${orderId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('payment failed');
      const data = await res.json();
      const mapped = mapApiOrderToUi(data) as Order & { warnings?: string[] };
      if (data.warnings) mapped.warnings = data.warnings;
      return mapped;
    } catch {
      return offlineCompletePayment(locationId, orderId, payload);
    }
  }

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

