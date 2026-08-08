import { prisma } from '../lib/db.ts';
import {
  calcGrowthPercent,
  HOURLY_SLOTS,
  previousPeriodRange,
  resolveLocationCoords,
  type DashboardReport,
  type DashboardReview,
  type DashboardShiftEntry,
  type LocationBreakdownRow,
  type PaymentBreakdown,
} from '../lib/dashboard.ts';
import {
  calculateFinancialMetrics,
  classifyAbcAnalysis,
  roundMoney,
} from '../lib/reports-financial.ts';
import type { RevenueByDayRow } from './reports.repository.ts';
import { reputationRepository } from './reputation.repository.ts';
import { scheduleRepository, toWeekStartString } from './schedule.repository.ts';

type OrderRow = Awaited<ReturnType<DashboardRepository['fetchOrders']>>[number];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function isCompletedOrder(o: { paid: boolean; status: string }): boolean {
  return o.paid || o.status === 'completed';
}

function buildRevenueByDay(orders: OrderRow[]): RevenueByDayRow[] {
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

function buildDishes(orders: OrderRow[]) {
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

function buildPaymentBreakdown(orders: OrderRow[]): PaymentBreakdown {
  let card = 0;
  let cash = 0;
  let app = 0;
  for (const order of orders.filter(isCompletedOrder)) {
    for (const tx of order.transactions) {
      if (tx.method === 'card') card += tx.amount;
      else if (tx.method === 'cash') cash += tx.amount;
      else app += tx.amount;
    }
  }
  const total = roundMoney(card + cash + app);
  return {
    card: roundMoney(card),
    cash: roundMoney(cash),
    app: roundMoney(app),
    total,
  };
}

function buildHourlySales(orders: OrderRow[], dayCount: number) {
  const all = HOURLY_SLOTS.map(() => 0);
  const byLocation: Record<string, number[]> = {};

  const divisor = Math.max(dayCount, 1);
  for (const order of orders.filter(isCompletedOrder)) {
    const hour = order.createdAt.getHours();
    if (hour < HOURLY_SLOTS[0] || hour > HOURLY_SLOTS[HOURLY_SLOTS.length - 1]) continue;
    const idx = hour - HOURLY_SLOTS[0];
    all[idx] += order.total;

    const locId = order.locationId;
    if (!byLocation[locId]) byLocation[locId] = HOURLY_SLOTS.map(() => 0);
    byLocation[locId][idx] += order.total;
  }

  return {
    all: all.map((v) => roundMoney(v / divisor)),
    byLocation: Object.fromEntries(
      Object.entries(byLocation).map(([k, arr]) => [k, arr.map((v) => roundMoney(v / divisor))])
    ),
  };
}

function buildLocationBreakdown(
  orders: OrderRow[],
  locations: Array<{ id: string; name: string }>
): LocationBreakdownRow[] {
  return locations.map((loc) => {
    const locOrders = orders.filter((o) => o.locationId === loc.id && isCompletedOrder(o));
    const gross = roundMoney(locOrders.reduce((s, o) => s + o.total, 0));
    const net = roundMoney(gross / 1.1);
    const count = locOrders.length;
    return {
      locationId: loc.id,
      name: loc.name,
      gross,
      net,
      orders: count,
      avgTicket: count > 0 ? roundMoney(gross / count) : 0,
    };
  });
}

function countDaysInclusive(start: Date, end: Date): number {
  const s = startOfDay(start);
  const e = startOfDay(end);
  return Math.round((e.getTime() - s.getTime()) / 86_400_000) + 1;
}

export class DashboardRepository {
  private async fetchOrders(startDate: Date, endDate: Date) {
    return prisma.order.findMany({
      where: { createdAt: { gte: startDate, lte: endDate } },
      include: {
        items: true,
        transactions: true,
        location: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async ensureDefaultLocation() {
    await prisma.location.upsert({
      where: { id: 'default' },
      update: {},
      create: { id: 'default', name: 'Corgi Cafe' },
    });
  }

  async getDashboard(startDate: Date, endDate: Date, compare = false): Promise<DashboardReport> {
    await this.ensureDefaultLocation();
    await reputationRepository.ensureSeedData('default');

    const [locations, orders, tables, customersInPeriod, reviewsInPeriod, openTimeCards, scheduleShifts] =
      await Promise.all([
        prisma.location.findMany({ orderBy: { name: 'asc' } }),
        this.fetchOrders(startDate, endDate),
        prisma.table.findMany({ select: { locationId: true, status: true } }),
        prisma.customer.count({
          where: { createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.customerReview.findMany({
          where: { reviewDate: { gte: startDate, lte: endDate } },
          orderBy: { reviewDate: 'desc' },
        }),
        prisma.timeCard.findMany({
          where: { clockOut: null },
          include: { user: { select: { id: true, locations: { select: { id: true } } } } },
        }),
        this.loadTodaySchedule(),
      ]);

    let previousOrders: OrderRow[] = [];
    let previousCustomers = 0;
    let previousReviews: typeof reviewsInPeriod = [];

    if (compare) {
      const prev = previousPeriodRange(startDate, endDate);
      [previousOrders, previousCustomers, previousReviews] = await Promise.all([
        this.fetchOrders(prev.startDate, prev.endDate),
        prisma.customer.count({
          where: { createdAt: { gte: prev.startDate, lte: prev.endDate } },
        }),
        prisma.customerReview.findMany({
          where: { reviewDate: { gte: prev.startDate, lte: prev.endDate } },
        }),
      ]);
    }

    const dayCount = countDaysInclusive(startDate, endDate);
    const summary = calculateFinancialMetrics(
      orders.map((o) => ({ total: o.total, status: o.status, paid: o.paid }))
    );
    const revenueByDay = buildRevenueByDay(orders);
    const dishes = buildDishes(orders);
    const paymentBreakdown = buildPaymentBreakdown(orders);
    const hourlySales = buildHourlySales(orders, dayCount);
    const revenueByLocation = buildLocationBreakdown(orders, locations);

    const revenueByDayByLocation = locations.map((loc) => ({
      locationId: loc.id,
      name: loc.name,
      days: buildRevenueByDay(orders.filter((o) => o.locationId === loc.id)),
    }));

    const activeTableStatuses = new Set(['occupied', 'billed']);
    const tableStats = locations.map((loc) => {
      const locTables = tables.filter((t) => t.locationId === loc.id);
      const active = locTables.filter((t) => activeTableStatuses.has(t.status)).length;
      return { locationId: loc.id, name: loc.name, active, total: locTables.length };
    });

    const clockedInIds = new Set(openTimeCards.map((c) => c.userId));

    const locationMetrics = locations.map((loc) => {
      const locOrders = orders.filter((o) => o.locationId === loc.id && isCompletedOrder(o));
      const gross = roundMoney(locOrders.reduce((s, o) => s + o.total, 0));
      const count = locOrders.length;
      const locReviews = reviewsInPeriod.filter((r) => r.locationId === loc.id);
      const prevLocReviews = previousReviews.filter((r) => r.locationId === loc.id);
      const tablesForLoc = tableStats.find((t) => t.locationId === loc.id);
      const staffOnDuty = openTimeCards.filter((c) =>
        c.user.locations.some((l) => l.id === loc.id)
      ).length;

      const coords = resolveLocationCoords(loc.name, loc.id);

      return {
        id: loc.id,
        name: loc.name,
        lat: coords.lat,
        lng: coords.lng,
        revenue: gross,
        orderCount: count,
        avgTicket: count > 0 ? roundMoney(gross / count) : 0,
        reviewCount: locReviews.length,
        reviewGrowth: compare
          ? calcGrowthPercent(locReviews.length, prevLocReviews.length)
          : null,
        signups: 0,
        signupGrowth: null,
        activeTables: tablesForLoc?.active ?? 0,
        totalTables: tablesForLoc?.total ?? 0,
        staffOnDuty,
      };
    });

    const recentReviews: DashboardReview[] = (
      await reputationRepository.findReviews({ limit: 5, offset: 0, locationId: undefined })
    ).items.map((r) => ({
      id: r.id,
      authorName: r.authorName,
      rating: r.rating,
      comment: r.comment,
      source: r.source,
      reviewDate: r.reviewDate.toISOString(),
    }));

    const shiftRoster = this.buildShiftRoster(scheduleShifts, clockedInIds);
    const signupGrowth = compare ? calcGrowthPercent(customersInPeriod, previousCustomers) : null;

    const activeTablesTotal = tableStats.reduce(
      (acc, t) => ({ active: acc.active + t.active, total: acc.total + t.total }),
      { active: 0, total: 0 }
    );

    const periodStart = startDate.toISOString().slice(0, 10);
    const periodEnd = endDate.toISOString().slice(0, 10);

    const base: DashboardReport = {
      summary,
      revenueByDay,
      dishes,
      staff: [],
      ledger: [],
      revenueByLocation,
      revenueByDayByLocation,
      paymentBreakdown,
      hourlySales,
      activeTables: { ...activeTablesTotal, byLocation: tableStats },
      locations: locationMetrics.sort((a, b) => b.revenue - a.revenue),
      recentReviews,
      shiftRoster,
      signups: {
        total: customersInPeriod,
        growth: signupGrowth,
        byLocation: locations.map((loc) => ({
          locationId: loc.id,
          name: loc.name,
          count: loc.id === 'default' ? customersInPeriod : 0,
        })),
      },
      periodLabel: { start: periodStart, end: periodEnd },
    };

    if (compare) {
      const prev = previousPeriodRange(startDate, endDate);
      const prevDayCount = countDaysInclusive(prev.startDate, prev.endDate);
      base.previousSummary = calculateFinancialMetrics(
        previousOrders.map((o) => ({ total: o.total, status: o.status, paid: o.paid }))
      );
      base.previousRevenueByDay = buildRevenueByDay(previousOrders);
      base.previousRevenueByLocation = buildLocationBreakdown(previousOrders, locations);
      base.previousPaymentBreakdown = buildPaymentBreakdown(previousOrders);
      base.previousHourlySales = buildHourlySales(previousOrders, prevDayCount);
    }

    return base;
  }

  private async loadTodaySchedule() {
    const today = new Date();
    const weekStart = toWeekStartString(today);
    const weekStartDate = new Date(`${weekStart}T00:00:00.000Z`);
    const shifts = await scheduleRepository.findByWeek(weekStartDate);
    const dayOfWeek = today.getDay();
    return shifts.filter((s) => s.dayOfWeek === dayOfWeek);
  }

  private buildShiftRoster(
    scheduleShifts: Awaited<ReturnType<typeof scheduleRepository.findByWeek>>,
    clockedInIds: Set<string>
  ): DashboardShiftEntry[] {
    if (scheduleShifts.length === 0) {
      return [];
    }
    return scheduleShifts.map((s) => ({
      userId: s.userId,
      userName: s.user.name,
      position: s.user.position,
      avatarInitials: s.user.avatarInitials,
      startTime: s.startTime,
      endTime: s.endTime,
      status: clockedInIds.has(s.userId) ? 'active' : 'offline',
    }));
  }
}

export const dashboardRepository = new DashboardRepository();
