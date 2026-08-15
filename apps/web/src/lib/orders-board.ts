export type BoardSourceFilter = 'all' | 'dine_in' | 'glovo' | 'ubereats';

export interface BoardOrderLike {
  status: string;
  source: string;
  time: Date;
  paid?: boolean;
  updatedAt?: Date;
}

const DRINK_KEYWORDS = [
  'latte',
  'coffee',
  'flat white',
  'espresso',
  'cappuccino',
  'juice',
  'tea',
  'mocha',
  'americano',
  'macchiato',
  'cortado',
];

export function isDeliverySource(source: string): boolean {
  return source === 'glovo' || source === 'ubereats';
}

/** Kitchen finished — delivery skips Served and goes to Ready for Pickup. */
export function getStatusAfterPreparing(source: string): string {
  if (isDeliverySource(source)) return 'ready';
  if (source === 'takeaway') return 'completed';
  return 'served';
}

/** Ready column action — delivery/takeaway complete; dine-in moves to Served. */
export function getStatusAfterReady(source: string): string {
  if (isDeliverySource(source) || source === 'takeaway') return 'completed';
  return 'served';
}

export function coerceStatusForSource(source: string, status: string): string {
  if (isDeliverySource(source) && status === 'served') return 'ready';
  return status;
}

export function getBoardColumnStatus(order: { status: string; source: string; paid?: boolean }): string {
  if (order.paid && order.status === 'served') return 'completed';
  if (isDeliverySource(order.source) && order.status === 'served') return 'ready';
  return order.status;
}

export function filterOrdersForColumn<T extends BoardOrderLike>(
  orders: T[],
  columnId: string,
  sourceFilter: BoardSourceFilter
): T[] {
  return orders.filter((o) => {
    if (getBoardColumnStatus(o) !== columnId) return false;
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'dine_in') return o.source === 'dine_in' || o.source === 'takeaway';
    return o.source === sourceFilter;
  });
}

export function normalizeBoardOrder<T extends { status: string; source: string; paid?: boolean }>(order: T): T {
  let normalized = order;
  if (order.paid && order.status === 'served') {
    normalized = { ...normalized, status: 'completed' };
  }
  if (isDeliverySource(order.source) && normalized.status === 'served') {
    normalized = { ...normalized, status: 'ready' };
  }
  return normalized;
}

export function getBoardSortTime(order: BoardOrderLike): number {
  const column = getBoardColumnStatus(order);
  if (column === 'completed' || column === 'cancelled') {
    return (order.updatedAt ?? order.time).getTime();
  }
  return order.time.getTime();
}

export function sortOrdersNewestFirst<T extends BoardOrderLike>(orders: T[]): T[] {
  return [...orders].sort((a, b) => getBoardSortTime(b) - getBoardSortTime(a));
}

/** @deprecated Use sortOrdersNewestFirst */
export function sortOrdersOldestFirst<T extends BoardOrderLike>(orders: T[]): T[] {
  return [...orders].sort((a, b) => getBoardSortTime(a) - getBoardSortTime(b));
}

export function isBarItem(name: string): boolean {
  const lower = name.toLowerCase();
  return DRINK_KEYWORDS.some((k) => lower.includes(k));
}

export function groupItemsKitchenVsBar(items: { name: string; quantity: number }[]): {
  bar: string[];
  kitchen: string[];
} {
  const bar: string[] = [];
  const kitchen: string[] = [];
  for (const item of items) {
    const line = `${item.quantity}x ${item.name}`;
    if (isBarItem(item.name)) bar.push(line);
    else kitchen.push(line);
  }
  return { bar, kitchen };
}

export function getOrderDisplayLabel(order: { id: string; orderNumber?: string }): string {
  return order.orderNumber || order.id.slice(0, 8).toUpperCase();
}

export const ACTIVE_BOARD_STATUSES = ['incoming', 'preparing', 'ready', 'served'] as const;
