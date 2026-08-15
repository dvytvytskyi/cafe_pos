import { mapApiOrderToUi, mapUiOrderToApi } from './mappers/order.mapper';
import type { Order, OrderItem, PayPayload } from './orders';
import {
  deleteActiveOrder,
  enqueueOutbox,
  getActiveOrder,
  getActiveOrdersByLocation,
  putActiveOrder,
  type ActiveOrderRecord,
  type OutboxEntry,
} from './pos-offline-db';

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `offline-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function recordToOrder(record: ActiveOrderRecord): Order {
  const ui = mapApiOrderToUi(record.data as Parameters<typeof mapApiOrderToUi>[0]) as Order;
  if (record.syncPending && !ui.paid) {
    (ui as Order & { syncPending?: boolean }).syncPending = true;
  }
  return ui;
}

function orderToRecord(order: Order, locationId: string, syncPending: boolean): ActiveOrderRecord {
  const api = mapUiOrderToApi({ ...order, locationId });
  return {
    id: order.id,
    locationId,
    data: api as Record<string, unknown>,
    syncPending,
    updatedAt: new Date().toISOString(),
  };
}

async function addOutbox(
  type: OutboxEntry['type'],
  locationId: string,
  payload: Record<string, unknown>,
  ids?: { orderId?: string; tableId?: string }
): Promise<void> {
  await enqueueOutbox({
    id: uuid(),
    type,
    locationId,
    orderId: ids?.orderId,
    tableId: ids?.tableId,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  });
}

export async function offlineGetOrders(locationId: string): Promise<Order[]> {
  const records = await getActiveOrdersByLocation(locationId);
  return records
    .map(recordToOrder)
    .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}

export async function offlineCreateOrder(
  locationId: string,
  order: Partial<Order> & { items: OrderItem[]; tableId?: string }
): Promise<Order> {
  const id = order.id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
  const apiPayload = mapUiOrderToApi({
    ...order,
    id,
    locationId,
    source: order.source || 'dine_in',
    status: order.status || 'preparing',
    items: order.items,
  });
  const ui = mapApiOrderToUi(apiPayload as Parameters<typeof mapApiOrderToUi>[0]) as Order;

  await putActiveOrder(orderToRecord(ui, locationId, true));
  await addOutbox('order_create', locationId, apiPayload as Record<string, unknown>, { orderId: id });
  return { ...ui, syncPending: true } as Order & { syncPending?: boolean };
}

export async function offlineUpdateOrder(
  locationId: string,
  id: string,
  order: Partial<Order> & { items?: OrderItem[] }
): Promise<Order> {
  const existing = await getActiveOrder(id);
  const prev = existing ? recordToOrder(existing) : ({} as Order);
  const merged = { ...prev, ...order, id };
  const apiPayload = mapUiOrderToApi({
    ...merged,
    locationId,
    ...(Array.isArray(order.items) && order.items.length > 0 ? { items: order.items } : {}),
  });
  const ui = mapApiOrderToUi(apiPayload as Parameters<typeof mapApiOrderToUi>[0]) as Order;

  await putActiveOrder(orderToRecord(ui, locationId, true));
  await addOutbox('order_update', locationId, apiPayload as Record<string, unknown>, { orderId: id });
  return { ...ui, syncPending: true } as Order & { syncPending?: boolean };
}

export async function offlineUpdateOrderStatus(
  locationId: string,
  id: string,
  status: string
): Promise<Order> {
  const existing = await getActiveOrder(id);
  if (!existing) throw new Error(`Order [${id}] not found offline`);
  const prev = recordToOrder(existing);
  const ui = { ...prev, status: status as Order['status'] };
  await putActiveOrder(orderToRecord(ui, locationId, true));
  await addOutbox('order_status', locationId, { status }, { orderId: id });
  return { ...ui, syncPending: true } as Order & { syncPending?: boolean };
}

export async function offlineDetachOrderFromTable(locationId: string, orderId: string): Promise<Order> {
  return offlineUpdateOrder(locationId, orderId, { tableId: undefined });
}

export async function offlineCompletePayment(
  locationId: string,
  orderId: string,
  payload: PayPayload
): Promise<Order & { warnings?: string[] }> {
  const existing = await getActiveOrder(orderId);
  if (!existing) throw new Error(`Order [${orderId}] not found offline`);
  const prev = recordToOrder(existing);
  const paid = true;
  const ui: Order = {
    ...prev,
    paid,
    payments: payload.payments,
    status: payload.markCompleted ? 'completed' : prev.status,
  };
  const apiPayload = {
    ...mapUiOrderToApi({ ...ui, locationId }),
    paymentStatus: 'paid',
    paid: true,
  };
  await putActiveOrder(orderToRecord(ui, locationId, true));
  await addOutbox('order_pay', locationId, payload as unknown as Record<string, unknown>, {
    orderId,
  });
  return { ...ui, syncPending: true, warnings: [] };
}

/** Replace snapshot from server bootstrap. */
export async function offlineReplaceOrdersSnapshot(
  locationId: string,
  orders: Order[]
): Promise<void> {
  const existing = await getActiveOrdersByLocation(locationId);
  for (const rec of existing) {
    if (!rec.syncPending) await deleteActiveOrder(rec.id);
  }
  for (const order of orders) {
    const pending = existing.find((r) => r.id === order.id && r.syncPending);
    if (pending) continue;
    await putActiveOrder(orderToRecord(order, locationId, false));
  }
}
