import type { Order } from './orders';
import type { Table } from './tables';

export type TableStatus = NonNullable<Table['status']>;

const ACTIVE_ORDER_STATUSES = new Set(['incoming', 'preparing', 'ready', 'served']);

export function getActiveOrdersForTable(orders: Order[], tableId: string): Order[] {
  return orders.filter(
    (o) =>
      o.tableId === tableId &&
      !o.paid &&
      o.status !== 'completed' &&
      o.status !== 'cancelled' &&
      ACTIVE_ORDER_STATUSES.has(o.status),
  );
}

/** Derive live floor-plan status from DB status + unpaid orders on the table. */
export function resolveTableDisplayStatus(dbStatus: TableStatus | undefined, orders: Order[], tableId: string): TableStatus {
  const status = dbStatus || 'available';
  const active = getActiveOrdersForTable(orders, tableId);

  if (status === 'dirty') return 'dirty';

  if (active.length > 0) {
    if (status === 'billed') return 'billed';
    return 'occupied';
  }

  if (status === 'occupied' || status === 'billed') {
    return 'available';
  }

  return status;
}
