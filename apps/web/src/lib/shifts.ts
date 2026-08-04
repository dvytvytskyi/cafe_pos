import { getOrders } from './orders';
import { logAuditEvent } from './audit';

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
  floatAmount: number; // Cash float at start
  expectedCash: number; // floatAmount + cashSales + cashIn - cashOut
  actualCash?: number;
  shortageOverage?: number;
  cashSales: number;
  cardSales: number;
  pointsSales: number;
  adjustments: CashAdjustment[];
  status: 'open' | 'closed';
}

export const getShifts = (): Shift[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('corgi_shifts');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((s: any) => ({
        ...s,
        openedAt: new Date(s.openedAt),
        closedAt: s.closedAt ? new Date(s.closedAt) : undefined,
        adjustments: s.adjustments.map((a: any) => ({ ...a, time: new Date(a.time) }))
      }));
    } catch (e) {
      console.error("Failed to parse shifts", e);
    }
  }

  // Generate mocks if empty
  const mocks: Shift[] = [
    {
      id: 'SHF-8492',
      openedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 - 8 * 60 * 60 * 1000), // 3 days ago
      closedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      floatAmount: 100,
      expectedCash: 350.50,
      actualCash: 350.50,
      shortageOverage: 0,
      cashSales: 250.50,
      cardSales: 450.00,
      pointsSales: 15.00,
      adjustments: [],
      status: 'closed'
    },
    {
      id: 'SHF-8511',
      openedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 9 * 60 * 60 * 1000), // 2 days ago
      closedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      floatAmount: 100,
      expectedCash: 420.00,
      actualCash: 418.50,
      shortageOverage: -1.50,
      cashSales: 350.00,
      cardSales: 510.00,
      pointsSales: 0,
      adjustments: [
        { type: 'out', amount: 30, reason: 'Milk delivery', time: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000 - 5 * 60 * 60 * 1000) }
      ],
      status: 'closed'
    },
    {
      id: 'SHF-8604',
      openedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000 - 8.5 * 60 * 60 * 1000), // 1 day ago
      closedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      floatAmount: 100,
      expectedCash: 285.00,
      actualCash: 290.00,
      shortageOverage: 5.00,
      cashSales: 185.00,
      cardSales: 320.50,
      pointsSales: 5.00,
      adjustments: [],
      status: 'closed'
    }
  ];
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_shifts', JSON.stringify(mocks));
  }
  return mocks;
};

export const saveShifts = (shifts: Shift[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_shifts', JSON.stringify(shifts));
  }
};

export const getCurrentShift = (): Shift | null => {
  const shifts = getShifts();
  return shifts.find(s => s.status === 'open') || null;
};

// Calculate financial metrics of a shift based on actual order payments during its timeframe
export const calculateShiftMetrics = (openedAt: Date, closedAt: Date | null, floatAmount: number, adjustments: CashAdjustment[]): {
  cashSales: number;
  cardSales: number;
  pointsSales: number;
  expectedCash: number;
} => {
  const allOrders = getOrders();
  const endTime = closedAt ? closedAt.getTime() : Date.now();
  const startTime = openedAt.getTime();

  let cashSales = 0;
  let cardSales = 0;
  let pointsSales = 0;

  // Filter paid completed orders in this shift's window
  allOrders.forEach(order => {
    const orderTime = new Date(order.time).getTime();
    if (order.paid && order.status === 'completed' && orderTime >= startTime && orderTime <= endTime) {
      if (order.payments) {
        order.payments.forEach(p => {
          if (p.method === 'cash') cashSales += p.amount;
          else if (p.method === 'card') cardSales += p.amount;
          else if (p.method === 'points') pointsSales += p.amount;
        });
      } else {
        // Fallback for orders without explicit payment array
        cashSales += order.total;
      }
    }
  });

  // Calculate Expected Cash: float + cash sales + cash in - cash out
  let expectedCash = floatAmount + cashSales;
  adjustments.forEach(adj => {
    if (adj.type === 'in') {
      expectedCash += adj.amount;
    } else {
      expectedCash -= adj.amount;
    }
  });

  return {
    cashSales: parseFloat(cashSales.toFixed(2)),
    cardSales: parseFloat(cardSales.toFixed(2)),
    pointsSales: parseFloat(pointsSales.toFixed(2)),
    expectedCash: parseFloat(expectedCash.toFixed(2))
  };
};

export const openShift = (floatAmount: number): Shift => {
  const shifts = getShifts();
  const current = getCurrentShift();
  if (current) return current; // Shift already open

  const newShift: Shift = {
    id: `SHF-${Date.now().toString().slice(-4)}`,
    openedAt: new Date(),
    floatAmount,
    expectedCash: floatAmount,
    cashSales: 0,
    cardSales: 0,
    pointsSales: 0,
    adjustments: [],
    status: 'open'
  };

  saveShifts([...shifts, newShift]);
  logAuditEvent('shift_open', { shiftId: newShift.id, floatAmount });
  return newShift;
};

export const closeShift = (shiftId: string, actualCash: number): Shift => {
  const shifts = getShifts();
  const closedAt = new Date();
  const updated = shifts.map(s => {
    if (s.id === shiftId && s.status === 'open') {
      const metrics = calculateShiftMetrics(s.openedAt, closedAt, s.floatAmount, s.adjustments);
      const shortageOverage = parseFloat((actualCash - metrics.expectedCash).toFixed(2));
      return {
        ...s,
        closedAt,
        actualCash: parseFloat(actualCash.toFixed(2)),
        shortageOverage,
        status: 'closed' as const,
        ...metrics
      };
    }
    return s;
  });
  saveShifts(updated);
  const result = updated.find(s => s.id === shiftId)!;
  logAuditEvent('shift_close', {
    shiftId,
    actualCash: result.actualCash,
    expectedCash: result.expectedCash,
    shortageOverage: result.shortageOverage
  });
  return result;
};

export const recordCashAdjustment = (shiftId: string, type: 'in' | 'out', amount: number, reason: string): Shift => {
  const shifts = getShifts();
  const updated = shifts.map(s => {
    if (s.id === shiftId && s.status === 'open') {
      const newAdjustment: CashAdjustment = {
        type,
        amount: parseFloat(amount.toFixed(2)),
        reason,
        time: new Date()
      };
      const adjustments = [...s.adjustments, newAdjustment];
      const metrics = calculateShiftMetrics(s.openedAt, null, s.floatAmount, adjustments);
      return {
        ...s,
        adjustments,
        ...metrics
      };
    }
    return s;
  });
  saveShifts(updated);
  logAuditEvent('cash_adjustment', { shiftId, type, amount, reason });
  return updated.find(s => s.id === shiftId)!;
};

// --- Database Connected Async Operations ---

export async function getShiftsAsync(locationId: string): Promise<any[]> {
  const res = await fetch(`/api/shifts?locationId=${locationId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch cash shifts from PostgreSQL');
  }
  return res.json();
}

export async function getCurrentShiftAsync(locationId: string): Promise<any | null> {
  const res = await fetch(`/api/shifts?locationId=${locationId}&active=true`);
  if (!res.ok) {
    throw new Error('Failed to fetch active cash shift from PostgreSQL');
  }
  return res.json();
}

export async function openShiftAsync(locationId: string, userId: string, floatAmount: number): Promise<any> {
  const res = await fetch('/api/shifts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationId, userId, floatStart: floatAmount }),
  });
  if (!res.ok) {
    throw new Error('Failed to open cash shift in PostgreSQL');
  }
  return res.json();
}

export async function closeShiftAsync(shiftId: string, actualCash: number): Promise<any> {
  const res = await fetch(`/api/shifts/${shiftId}/close`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ actualCash }),
  });
  if (!res.ok) {
    throw new Error(`Failed to close cash shift [${shiftId}] in PostgreSQL`);
  }
  return res.json();
}

export async function recordCashAdjustmentAsync(shiftId: string, type: 'in' | 'out', amount: number, reason: string): Promise<any> {
  const res = await fetch(`/api/shifts/${shiftId}/adjust`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, amount, reason }),
  });
  if (!res.ok) {
    throw new Error(`Failed to record cash adjustment for shift [${shiftId}] in PostgreSQL`);
  }
  return res.json();
}

