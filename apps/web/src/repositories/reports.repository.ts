import { prisma } from '../lib/db.ts';
import type { FinancialReportFilters } from '../lib/reports-financial-validation.ts';
import {
  calculateFinancialMetrics,
  classifyAbcAnalysis,
  roundMoney,
  type DishAbcRow,
  type FinancialSummaryMetrics,
} from '../lib/reports-financial.ts';

export type RevenueByDayRow = {
  date: string;
  gross: number;
  net: number;
  orders: number;
};

export type StaffPerformanceRow = {
  name: string;
  revenue: number;
  orderCount: number;
};

export type LedgerRow = {
  id: string;
  time: string;
  location: string;
  type: 'Receipt' | 'Void';
  amount: number;
  base: number;
  iva: number;
  hash: string;
  synced: boolean;
};

export type FinancialReport = {
  summary: FinancialSummaryMetrics;
  revenueByDay: RevenueByDayRow[];
  dishes: DishAbcRow[];
  staff: StaffPerformanceRow[];
  ledger: LedgerRow[];
};

function resolveWaiterName(
  orderCreatedAt: Date,
  shifts: Array<{ openedAt: Date; closedAt: Date | null; user: { name: string } }>
): string | null {
  const shift = shifts.find(
    (s) =>
      s.openedAt.getTime() <= orderCreatedAt.getTime() &&
      (!s.closedAt || s.closedAt.getTime() >= orderCreatedAt.getTime())
  );
  return shift?.user.name ?? null;
}

export class ReportsRepository {
  async getFinancialReport(filters: FinancialReportFilters): Promise<FinancialReport> {
    const { locationId, startDate, endDate } = filters;

    const orderWhere = {
      locationId,
      createdAt: { gte: startDate, lte: endDate },
    };

    const [orders, shifts, fiscalRows] = await Promise.all([
      prisma.order.findMany({
        where: orderWhere,
        include: {
          items: true,
          transactions: true,
          location: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.cashShift.findMany({
        where: { locationId },
        include: { user: { select: { name: true } } },
      }),
      prisma.fiscalRecord.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          order: { locationId },
        },
        include: { order: { include: { location: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const summary = calculateFinancialMetrics(
      orders.map((o) => ({ total: o.total, status: o.status, paid: o.paid }))
    );

    const dayMap = new Map<string, { gross: number; orders: number }>();
    for (const order of orders.filter((o) => o.paid || o.status === 'completed')) {
      const day = order.createdAt.toISOString().slice(0, 10);
      const existing = dayMap.get(day) ?? { gross: 0, orders: 0 };
      existing.gross += order.total;
      existing.orders += 1;
      dayMap.set(day, existing);
    }

    const revenueByDay: RevenueByDayRow[] = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, row]) => ({
        date,
        gross: roundMoney(row.gross),
        net: roundMoney(row.gross / 1.1),
        orders: row.orders,
      }));

    const dishMap = new Map<string, { name: string; category: string; revenue: number; quantity: number }>();
    for (const order of orders.filter((o) => o.paid || o.status === 'completed')) {
      for (const item of order.items) {
        const key = item.name;
        const existing = dishMap.get(key) ?? {
          name: item.name,
          category: 'Menu',
          revenue: 0,
          quantity: 0,
        };
        existing.revenue += item.price * item.quantity;
        existing.quantity += item.quantity;
        dishMap.set(key, existing);
      }
    }

    const dishes = classifyAbcAnalysis(
      [...dishMap.values()].map((d) => ({
        ...d,
        revenue: roundMoney(d.revenue),
      }))
    );

    const staffMap = new Map<string, { name: string; revenue: number; orderCount: number }>();
    for (const order of orders.filter((o) => o.paid || o.status === 'completed')) {
      const waiter = resolveWaiterName(order.createdAt, shifts) ?? 'Unassigned';
      const existing = staffMap.get(waiter) ?? { name: waiter, revenue: 0, orderCount: 0 };
      existing.revenue += order.total;
      existing.orderCount += 1;
      staffMap.set(waiter, existing);
    }

    const staff: StaffPerformanceRow[] = [...staffMap.values()]
      .map((s) => ({ ...s, revenue: roundMoney(s.revenue) }))
      .sort((a, b) => b.revenue - a.revenue);

    const ledger: LedgerRow[] = fiscalRows.map((f) => ({
      id: f.invoiceNumber,
      time: f.createdAt.toISOString().slice(11, 16),
      location: f.order.location.name,
      type: f.recordType === 'rectificativa' ? 'Void' : 'Receipt',
      amount: roundMoney(f.total),
      base: roundMoney(f.taxBase),
      iva: roundMoney(f.taxAmount),
      hash: f.hash.slice(0, 8) + '...' + f.hash.slice(-4),
      synced: f.isSyncAEAT,
    }));

    return { summary, revenueByDay, dishes, staff, ledger };
  }
}

export const reportsRepository = new ReportsRepository();
