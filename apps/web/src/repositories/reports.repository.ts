import { prisma } from '../lib/db.ts';
import type { FinancialReportFilters } from '../lib/reports-financial-validation.ts';
import { previousPeriodRange } from '../lib/dashboard.ts';
import { filterOrdersByPayment, type DashboardPaymentFilter } from '../lib/dashboard.ts';
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

export type StaffByLocation = {
  locationId: string;
  name: string;
  staff: StaffPerformanceRow[];
};

export type RevenueByDayByLocation = {
  locationId: string;
  name: string;
  days: RevenueByDayRow[];
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
  staffByLocation: StaffByLocation[];
  ledger: LedgerRow[];
  revenueByDayByLocation: RevenueByDayByLocation[];
  previousSummary?: FinancialSummaryMetrics;
  previousRevenueByDay?: RevenueByDayRow[];
  previousRevenueByDayByLocation?: RevenueByDayByLocation[];
};

type OrderWithRelations = Awaited<ReturnType<ReportsRepository['fetchOrders']>>[number];
type ShiftRow = { locationId: string; openedAt: Date; closedAt: Date | null; user: { name: string } };

function isCompletedOrder(o: { paid: boolean; status: string }): boolean {
  return o.paid || o.status === 'completed';
}

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

function buildRevenueByDay(orders: OrderWithRelations[]): RevenueByDayRow[] {
  const dayMap = new Map<string, { gross: number; orders: number }>();
  for (const order of orders.filter(isCompletedOrder)) {
    const day = order.createdAt.toISOString().slice(0, 10);
    const existing = dayMap.get(day) ?? { gross: 0, orders: 0 };
    existing.gross += order.total;
    existing.orders += 1;
    dayMap.set(day, existing);
  }
  return [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => ({
      date,
      gross: roundMoney(row.gross),
      net: roundMoney(row.gross / 1.1),
      orders: row.orders,
    }));
}

function buildDishes(orders: OrderWithRelations[]): DishAbcRow[] {
  const dishMap = new Map<string, { name: string; category: string; revenue: number; quantity: number }>();
  for (const order of orders.filter(isCompletedOrder)) {
    for (const item of order.items) {
      const existing = dishMap.get(item.name) ?? {
        name: item.name,
        category: 'Menu',
        revenue: 0,
        quantity: 0,
      };
      existing.revenue += item.price * item.quantity;
      existing.quantity += item.quantity;
      dishMap.set(item.name, existing);
    }
  }
  return classifyAbcAnalysis(
    [...dishMap.values()].map((d) => ({ ...d, revenue: roundMoney(d.revenue) }))
  );
}

function buildStaffPerformance(
  orders: OrderWithRelations[],
  shifts: ShiftRow[]
): StaffPerformanceRow[] {
  const staffMap = new Map<string, { name: string; revenue: number; orderCount: number }>();
  for (const order of orders.filter(isCompletedOrder)) {
    const locShifts = shifts.filter((s) => s.locationId === order.locationId);
    const waiter = resolveWaiterName(order.createdAt, locShifts) ?? 'Unassigned';
    const existing = staffMap.get(waiter) ?? { name: waiter, revenue: 0, orderCount: 0 };
    existing.revenue += order.total;
    existing.orderCount += 1;
    staffMap.set(waiter, existing);
  }
  return [...staffMap.values()]
    .map((s) => ({ ...s, revenue: roundMoney(s.revenue) }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildStaffByLocation(
  orders: OrderWithRelations[],
  shifts: ShiftRow[],
  locations: Array<{ id: string; name: string }>
): StaffByLocation[] {
  return locations.map((loc) => ({
    locationId: loc.id,
    name: loc.name,
    staff: buildStaffPerformance(
      orders.filter((o) => o.locationId === loc.id),
      shifts.filter((s) => s.locationId === loc.id)
    ),
  }));
}

function buildLedger(
  fiscalRows: Array<{
    invoiceNumber: string;
    createdAt: Date;
    recordType: string;
    total: number;
    taxBase: number;
    taxAmount: number;
    hash: string;
    isSyncAEAT: boolean;
    order: { location: { name: string } };
  }>
): LedgerRow[] {
  return fiscalRows.map((f) => ({
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
}

function isReportLocation(name: string): boolean {
  return !/\btest\b/i.test(name);
}

export class ReportsRepository {
  async fetchOrders(startDate: Date, endDate: Date, locationId: string) {
    const isAllLocations = locationId === 'all';
    return prisma.order.findMany({
      where: {
        ...(isAllLocations ? {} : { locationId }),
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: true,
        transactions: true,
        location: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private buildReportFromOrders(
    orders: OrderWithRelations[],
    shifts: ShiftRow[],
    locations: Array<{ id: string; name: string }>,
    fiscalRows: Parameters<typeof buildLedger>[0],
    scopeLocationId: string
  ): Omit<
    FinancialReport,
    'previousSummary' | 'previousRevenueByDay' | 'previousRevenueByDayByLocation'
  > {
    const summary = calculateFinancialMetrics(
      orders.map((o) => ({ total: o.total, status: o.status, paid: o.paid }))
    );
    const revenueByDay = buildRevenueByDay(orders);
    const dishes = buildDishes(orders);
    const targetLocations =
      scopeLocationId === 'all'
        ? locations
        : locations.filter((l) => l.id === scopeLocationId);
    const staffByLocation = buildStaffByLocation(orders, shifts, targetLocations);
    const staff =
      scopeLocationId === 'all'
        ? buildStaffPerformance(orders, shifts)
        : (staffByLocation[0]?.staff ?? []);
    const revenueByDayByLocation = targetLocations.map((loc) => ({
      locationId: loc.id,
      name: loc.name,
      days: buildRevenueByDay(orders.filter((o) => o.locationId === loc.id)),
    }));
    const ledger = buildLedger(fiscalRows);

    return { summary, revenueByDay, dishes, staff, staffByLocation, ledger, revenueByDayByLocation };
  }

  async getFinancialReport(
    filters: FinancialReportFilters,
    compare = false,
    paymentFilter: DashboardPaymentFilter = 'all'
  ): Promise<FinancialReport> {
    const { locationId, startDate, endDate } = filters;
    const isAllLocations = locationId === 'all';

    const [allLocations, rawOrders, shifts, rawFiscalRows] = await Promise.all([
      prisma.location.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
      this.fetchOrders(startDate, endDate, locationId),
      prisma.cashShift.findMany({
        where: isAllLocations ? {} : { locationId },
        include: { user: { select: { name: true } } },
      }),
      prisma.fiscalRecord.findMany({
        where: {
          createdAt: { gte: startDate, lte: endDate },
          ...(isAllLocations ? {} : { order: { locationId } }),
        },
        include: { order: { include: { location: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const locations = allLocations.filter((l) => isReportLocation(l.name));
    const orders = filterOrdersByPayment(rawOrders, paymentFilter);
    const orderIds = new Set(orders.map((o) => o.id));
    const fiscalRows =
      paymentFilter === 'all'
        ? rawFiscalRows
        : rawFiscalRows.filter((f) => orderIds.has(f.orderId));

    const base = this.buildReportFromOrders(
      orders,
      shifts,
      locations,
      fiscalRows,
      locationId
    );

    if (!compare) return base;

    const prev = previousPeriodRange(startDate, endDate);
    const [prevRawOrders, prevRawFiscalRows] = await Promise.all([
      this.fetchOrders(prev.startDate, prev.endDate, locationId),
      prisma.fiscalRecord.findMany({
        where: {
          createdAt: { gte: prev.startDate, lte: prev.endDate },
          ...(isAllLocations ? {} : { order: { locationId } }),
        },
        include: { order: { include: { location: { select: { name: true } } } } },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    const prevOrders = filterOrdersByPayment(prevRawOrders, paymentFilter);
    const prevOrderIds = new Set(prevOrders.map((o) => o.id));
    const prevFiscalRows =
      paymentFilter === 'all'
        ? prevRawFiscalRows
        : prevRawFiscalRows.filter((f) => prevOrderIds.has(f.orderId));

    const prevReport = this.buildReportFromOrders(
      prevOrders,
      shifts,
      locations,
      prevFiscalRows,
      locationId
    );

    return {
      ...base,
      previousSummary: prevReport.summary,
      previousRevenueByDay: prevReport.revenueByDay,
      previousRevenueByDayByLocation: prevReport.revenueByDayByLocation,
    };
  }
}

export const reportsRepository = new ReportsRepository();
