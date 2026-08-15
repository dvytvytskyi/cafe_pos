import { logAuditEvent } from './audit';
import type { Order } from './orders';

export interface CashAdjustment {
  type: 'in' | 'out';
  amount: number;
  reason: string;
  time: Date;
}

export interface Shift {
  id: string;
  openedAt: Date;
  closedAt?: Date;
  openedByName?: string;
  floatAmount: number;
  expectedCash: number;
  actualCash?: number;
  shortageOverage?: number;
  cashSales: number;
  cardSales: number;
  pointsSales: number;
  adjustments: CashAdjustment[];
  status: 'open' | 'closed';
}

function normalizeAdjustmentType(type: unknown): 'in' | 'out' {
  if (type === 'in' || type === 'cash_in') return 'in';
  return 'out';
}

function parseAdjustmentTime(value: unknown, fallback: Date): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    const hm = value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (hm) {
      const d = new Date(fallback);
      d.setHours(parseInt(hm[1], 10), parseInt(hm[2], 10), 0, 0);
      return d;
    }
  }
  return fallback;
}

export function formatShiftAdjustmentTime(time: Date): string {
  if (Number.isNaN(time.getTime())) return '—';
  return time.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function mapApiShiftToUi(raw: Record<string, unknown>): Shift {
  const openedAt = new Date(raw.openedAt as string);
  const user = raw.user as { name?: string } | null | undefined;
  const adjustments = ((raw.adjustments as CashAdjustment[] | null) ?? []).map((a) => ({
    type: normalizeAdjustmentType(a.type),
    amount: Number(a.amount ?? 0),
    reason: String(a.reason ?? ''),
    time: parseAdjustmentTime(a.time, openedAt),
  }));
  return {
    id: String(raw.id),
    openedAt,
    closedAt: raw.closedAt ? new Date(raw.closedAt as string) : undefined,
    openedByName: user?.name,
    floatAmount: Number(raw.floatStart ?? raw.floatAmount ?? 0),
    expectedCash: Number(raw.expected ?? raw.expectedCash ?? 0),
    actualCash: raw.actual != null ? Number(raw.actual) : raw.actualCash != null ? Number(raw.actualCash) : undefined,
    shortageOverage: raw.difference != null ? Number(raw.difference) : raw.shortageOverage != null ? Number(raw.shortageOverage) : undefined,
    cashSales: Number(raw.cashSales ?? 0),
    cardSales: Number(raw.cardSales ?? 0),
    pointsSales: Number(raw.pointsSales ?? 0),
    adjustments,
    status: (raw.status as Shift['status']) ?? 'closed',
  };
}

/** @deprecated Use getShiftsAsync — shifts are stored in PostgreSQL. */
export const getShifts = (): Shift[] => [];

/** @deprecated No-op — shifts are stored in PostgreSQL. */
export const saveShifts = (_shifts: Shift[]) => {};

/** @deprecated Use getCurrentShiftAsync. */
export const getCurrentShift = (): Shift | null => null;

export const calculateShiftMetrics = (
  openedAt: Date,
  closedAt: Date | null,
  floatAmount: number,
  adjustments: CashAdjustment[],
  orders: Order[] = []
): {
  cashSales: number;
  cardSales: number;
  pointsSales: number;
  expectedCash: number;
} => {
  const endTime = closedAt ? closedAt.getTime() : Date.now();
  const startTime = openedAt.getTime();

  let cashSales = 0;
  let cardSales = 0;
  let pointsSales = 0;

  orders.forEach((order) => {
    const orderTime = new Date(order.time).getTime();
    if (order.paid && order.status === 'completed' && orderTime >= startTime && orderTime <= endTime) {
      if (order.payments) {
        order.payments.forEach((p) => {
          if (p.method === 'cash') cashSales += p.amount;
          else if (p.method === 'card') cardSales += p.amount;
          else if (p.method === 'points') pointsSales += p.amount;
        });
      } else {
        cashSales += order.total;
      }
    }
  });

  let expectedCash = floatAmount + cashSales;
  adjustments.forEach((adj) => {
    if (adj.type === 'in') expectedCash += adj.amount;
    else expectedCash -= adj.amount;
  });

  return {
    cashSales: parseFloat(cashSales.toFixed(2)),
    cardSales: parseFloat(cardSales.toFixed(2)),
    pointsSales: parseFloat(pointsSales.toFixed(2)),
    expectedCash: parseFloat(expectedCash.toFixed(2)),
  };
};

/** @deprecated Use openShiftAsync. */
export const openShift = (_floatAmount: number): Shift => {
  throw new Error('openShift is deprecated — use openShiftAsync');
};

/** @deprecated Use closeShiftAsync. */
export const closeShift = (_shiftId: string, _actualCash: number): Shift => {
  throw new Error('closeShift is deprecated — use closeShiftAsync');
};

/** @deprecated Use recordCashAdjustmentAsync. */
export const recordCashAdjustment = (
  _shiftId: string,
  _type: 'in' | 'out',
  _amount: number,
  _reason: string
): Shift => {
  throw new Error('recordCashAdjustment is deprecated — use recordCashAdjustmentAsync');
};

export async function getShiftsAsync(locationId: string): Promise<Shift[]> {
  const res = await fetch(`/api/shifts?locationId=${locationId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch cash shifts from PostgreSQL');
  }
  const data = await res.json();
  return (Array.isArray(data) ? data : []).map((s) => mapApiShiftToUi(s));
}

export async function getCurrentShiftAsync(locationId: string): Promise<Shift | null> {
  const res = await fetch(`/api/shifts?locationId=${locationId}&active=true`);
  if (!res.ok) {
    throw new Error('Failed to fetch active cash shift from PostgreSQL');
  }
  const data = await res.json();
  return data ? mapApiShiftToUi(data) : null;
}

export async function openShiftAsync(locationId: string, userId: string, floatAmount: number): Promise<Shift> {
  const res = await fetch('/api/shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId, userId, floatStart: floatAmount }),
  });
  if (!res.ok) {
    throw new Error('Failed to open cash shift in PostgreSQL');
  }
  const shift = mapApiShiftToUi(await res.json());
  logAuditEvent('shift_open', { shiftId: shift.id, floatAmount });
  return shift;
}

export async function closeShiftAsync(shiftId: string, actualCash: number): Promise<Shift> {
  const res = await fetch(`/api/shifts/${shiftId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actualCash }),
  });
  if (!res.ok) {
    throw new Error(`Failed to close cash shift [${shiftId}] in PostgreSQL`);
  }
  const shift = mapApiShiftToUi(await res.json());
  logAuditEvent('shift_close', {
    shiftId,
    actualCash: shift.actualCash,
    expectedCash: shift.expectedCash,
    shortageOverage: shift.shortageOverage,
  });
  return shift;
}

export async function recordCashAdjustmentAsync(
  shiftId: string,
  type: 'in' | 'out',
  amount: number,
  reason: string
): Promise<Shift> {
  const res = await fetch(`/api/shifts/${shiftId}/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, amount, reason }),
  });
  if (!res.ok) {
    throw new Error(`Failed to record cash adjustment for shift [${shiftId}] in PostgreSQL`);
  }
  const shift = mapApiShiftToUi(await res.json());
  logAuditEvent('cash_adjustment', { shiftId, type, amount, reason });
  return shift;
}
