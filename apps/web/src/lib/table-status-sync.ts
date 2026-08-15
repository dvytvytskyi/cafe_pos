import type { Order } from './orders';
import type { Table } from './tables';
import type { TableDisplayStatus } from './table-display-status';

export type TableStatus = NonNullable<Table['status']>;

const ACTIVE_ORDER_STATUSES = new Set(['incoming', 'preparing', 'ready', 'served']);

/** Most advanced pipeline status wins when multiple orders share a table. */
const ORDER_STATUS_RANK: TableDisplayStatus[] = ['served', 'ready', 'preparing', 'incoming'];

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

function dominantOrderStatus(orders: Order[]): TableDisplayStatus {
  for (const status of ORDER_STATUS_RANK) {
    if (orders.some((o) => o.status === status)) return status;
  }
  return 'preparing';
}

/** Unpaid open order on a table (any pipeline status). */
export function getOpenOrderForTable(orders: Order[], tableId: string): Order | undefined {
  const open = orders.filter(
    (o) =>
      o.tableId === tableId &&
      !o.paid &&
      o.status !== 'completed' &&
      o.status !== 'cancelled',
  );
  if (open.length === 0) return undefined;

  for (const status of ORDER_STATUS_RANK) {
    const match = open.find((o) => o.status === status);
    if (match) return match;
  }
  return open[0];
}

/** Derive live floor-plan status from DB status + unpaid orders on the table. */
export function resolveTableDisplayStatus(
  dbStatus: TableStatus | undefined,
  orders: Order[],
  tableId: string,
): TableDisplayStatus {
  const status = dbStatus === 'dirty' ? 'available' : dbStatus || 'available';

  const active = getActiveOrdersForTable(orders, tableId);

  if (active.length > 0) {
    if (status === 'billed') return 'billed';
    return dominantOrderStatus(active);
  }

  if (status === 'occupied' || status === 'billed') return status;

  return 'available';
}
