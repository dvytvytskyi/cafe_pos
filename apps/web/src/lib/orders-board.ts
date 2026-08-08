export type BoardSourceFilter = 'all' | 'dine_in' | 'glovo' | 'ubereats';

export interface BoardOrderLike {
  status: string;
  source: string;
  time: Date;
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

export function filterOrdersForColumn<T extends BoardOrderLike>(
  orders: T[],
  columnId: string,
  sourceFilter: BoardSourceFilter
): T[] {
  return orders.filter((o) => {
    if (o.status !== columnId) return false;
    if (sourceFilter === 'all') return true;
    if (sourceFilter === 'dine_in') return o.source === 'dine_in' || o.source === 'takeaway';
    return o.source === sourceFilter;
  });
}

export function sortOrdersOldestFirst<T extends BoardOrderLike>(orders: T[]): T[] {
  return [...orders].sort((a, b) => a.time.getTime() - b.time.getTime());
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

export const ACTIVE_BOARD_STATUSES = ['incoming', 'preparing', 'ready', 'served'] as const;
