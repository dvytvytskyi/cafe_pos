/** Live floor-plan status: persisted table state or derived from active order pipeline. */
export type TableDisplayStatus =
  | 'available'
  | 'incoming'
  | 'preparing'
  | 'ready'
  | 'served'
  | 'occupied'
  | 'billed';

/** Statuses where clicking the table opens the order sidebar (not the POS terminal). */
export const ORDER_SIDEBAR_STATUSES: TableDisplayStatus[] = [
  'incoming',
  'preparing',
  'ready',
  'served',
  'occupied',
  'billed',
];

export function shouldShowOrderSidebar(status: TableDisplayStatus): boolean {
  return ORDER_SIDEBAR_STATUSES.includes(status);
}

export type TableDisplayStyle = {
  label: string;
  fill: string;
  stroke: string;
  badgeFill: string;
  badgeStroke: string;
  badgeText: string;
};

export const TABLE_DISPLAY_STYLES: Record<TableDisplayStatus, TableDisplayStyle> = {
  available: {
    label: 'Free',
    fill: '#fffbeb',
    stroke: '#fdbd38',
    badgeFill: '#f3f4f6',
    badgeStroke: '#9ca3af',
    badgeText: '#374151',
  },
  incoming: {
    label: 'Incoming',
    fill: '#dbeafe',
    stroke: '#2563eb',
    badgeFill: '#dbeafe',
    badgeStroke: '#2563eb',
    badgeText: '#1e40af',
  },
  preparing: {
    label: 'Preparing',
    fill: '#fef3c7',
    stroke: '#d97706',
    badgeFill: '#fef3c7',
    badgeStroke: '#d97706',
    badgeText: '#92400e',
  },
  ready: {
    label: 'Ready',
    fill: '#dcfce7',
    stroke: '#16a34a',
    badgeFill: '#dcfce7',
    badgeStroke: '#16a34a',
    badgeText: '#166534',
  },
  served: {
    label: 'Served',
    fill: '#e0e7ff',
    stroke: '#4f46e5',
    badgeFill: '#e0e7ff',
    badgeStroke: '#4f46e5',
    badgeText: '#3730a3',
  },
  occupied: {
    label: 'Occupied',
    fill: '#fee2e2',
    stroke: '#ef4444',
    badgeFill: '#fee2e2',
    badgeStroke: '#ef4444',
    badgeText: '#991b1b',
  },
  billed: {
    label: 'Billed',
    fill: '#fce7f3',
    stroke: '#db2777',
    badgeFill: '#fce7f3',
    badgeStroke: '#db2777',
    badgeText: '#9d174d',
  },
};

export function getTableDisplayStyle(status: TableDisplayStatus): TableDisplayStyle {
  return TABLE_DISPLAY_STYLES[status] ?? TABLE_DISPLAY_STYLES.available;
}
