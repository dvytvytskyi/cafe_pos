import type { FinancialReport, RevenueByDayByLocation, RevenueByDayRow } from '../repositories/reports.repository';
import type { DashboardPaymentFilter, DashboardReport } from './dashboard';
import { calcGrowthPercent, formatPeriodLabel, previousPeriodRange } from './dashboard';
import { roundMoney } from './reports-financial';

export class ReportsApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'ReportsApiError';
    this.status = status;
  }
}

export async function getFinancialReportAsync(params: {
  startDate: string;
  endDate: string;
  locationId?: string;
  compare?: boolean;
  paymentMethod?: DashboardPaymentFilter;
}): Promise<FinancialReport> {
  const qs = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    locationId: params.locationId ?? 'all',
  });
  if (params.compare) qs.set('compare', 'true');
  if (params.paymentMethod && params.paymentMethod !== 'all') {
    qs.set('paymentMethod', params.paymentMethod);
  }
  const res = await fetch(`/api/reports/financial?${qs.toString()}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ReportsApiError(body.error ?? 'Failed to load financial report', res.status);
  }
  return body;
}

export async function getDashboardReportAsync(params: {
  startDate: string;
  endDate: string;
  compare?: boolean;
  paymentMethod?: DashboardPaymentFilter;
}): Promise<DashboardReport> {
  const qs = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    locationId: 'default',
  });
  if (params.compare) qs.set('compare', 'true');
  if (params.paymentMethod && params.paymentMethod !== 'all') {
    qs.set('paymentMethod', params.paymentMethod);
  }
  const res = await fetch(`/api/reports/dashboard?${qs.toString()}`);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ReportsApiError(body.error ?? 'Failed to load dashboard report', res.status);
  }
  return body;
}

export function toLocalIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function presetToDateRange(preset: string): { startDate: string; endDate: string } {
  const today = new Date();
  const end = toLocalIsoDate(today);

  if (preset === 'Today') {
    return { startDate: end, endDate: end };
  }
  if (preset === 'Last 7 days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 6);
    return { startDate: toLocalIsoDate(start), endDate: end };
  }
  if (preset === 'Last 30 days') {
    const start = new Date(today);
    start.setDate(start.getDate() - 29);
    return { startDate: toLocalIsoDate(start), endDate: end };
  }
  if (preset === '2026') {
    return { startDate: '2026-01-01', endDate: '2026-12-31' };
  }
  const start = new Date(today);
  start.setFullYear(start.getFullYear() - 5);
  return { startDate: toLocalIsoDate(start), endDate: end };
}

export function monthsToDateRange(
  year: number,
  months: number[]
): { startDate: string; endDate: string } {
  const selected = months.length > 0 ? [...months].sort((a, b) => a - b) : [new Date().getMonth()];
  const y = months.length > 0 ? year : new Date().getFullYear();
  const firstMonth = selected[0];
  const lastMonth = selected[selected.length - 1];
  const startDate = `${y}-${String(firstMonth + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(y, lastMonth + 1, 0).getDate();
  const endDate = `${y}-${String(lastMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { startDate, endDate };
}

export function clampDateRangeToToday(range: DateRangeValue): DateRangeValue {
  const today = toLocalIsoDate(new Date());
  if (range.endDate > today) {
    return { startDate: range.startDate, endDate: today };
  }
  return range;
}

export function countDaysInRange(startDate: string, endDate: string): number {
  const start = new Date(startDate + 'T12:00:00');
  const end = new Date(endDate + 'T12:00:00');
  return Math.max(0, Math.round((end.getTime() - start.getTime()) / 86_400_000) + 1);
}

export function previousPeriodDateRange(range: DateRangeValue): DateRangeValue {
  const prev = previousPeriodRange(
    new Date(range.startDate + 'T12:00:00'),
    new Date(range.endDate + 'T12:00:00')
  );
  return {
    startDate: toLocalIsoDate(prev.startDate),
    endDate: toLocalIsoDate(prev.endDate),
  };
}

export function formatActivePeriodLabel(range: DateRangeValue): string {
  return formatPeriodLabel(range.startDate, range.endDate);
}

const WEEKLY_CHART_THRESHOLD_DAYS = 14;

export function shouldAggregateChartByWeek(range: DateRangeValue): boolean {
  return countDaysInRange(range.startDate, range.endDate) > WEEKLY_CHART_THRESHOLD_DAYS;
}

function weekStartIso(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  const dayOfWeek = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((dayOfWeek + 6) % 7));
  return toLocalIsoDate(monday);
}

export function aggregateRevenueByWeek(days: RevenueByDayRow[]): RevenueByDayRow[] {
  const weekMap = new Map<string, { gross: number; net: number; orders: number }>();
  for (const day of days) {
    const key = weekStartIso(day.date);
    const existing = weekMap.get(key) ?? { gross: 0, net: 0, orders: 0 };
    existing.gross += day.gross;
    existing.net += day.net;
    existing.orders += day.orders;
    weekMap.set(key, existing);
  }
  return [...weekMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, row]) => ({
      date,
      gross: roundMoney(row.gross),
      net: roundMoney(row.net),
      orders: row.orders,
    }));
}

export function prepareChartRevenueByDay(
  days: RevenueByDayRow[] | undefined,
  range: DateRangeValue
): RevenueByDayRow[] {
  const source = days ?? [];
  if (!shouldAggregateChartByWeek(range)) return source;
  return aggregateRevenueByWeek(source);
}

export function prepareChartRevenueByLocation(
  byLocation: RevenueByDayByLocation[] | undefined,
  range: DateRangeValue
): RevenueByDayByLocation[] {
  const source = byLocation ?? [];
  if (!shouldAggregateChartByWeek(range)) return source;
  return source.map((loc) => ({
    ...loc,
    days: aggregateRevenueByWeek(loc.days),
  }));
}

export type DateRangeValue = { startDate: string; endDate: string };

export type RevenueTableRow = {
  id: string;
  date: string;
  dateIso: string;
  location: string;
  gross: number;
  prevGross: number;
  net: number;
  prevNet: number;
  orders: number;
  avgCheck: number;
};

function formatRevenueTableDate(iso: string): string {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function prevDayLookup(
  byLocation: RevenueByDayByLocation[] | undefined,
  locationId: string,
  date: string
): RevenueByDayRow | undefined {
  return byLocation?.find((l) => l.locationId === locationId)?.days.find((d) => d.date === date);
}

type RevenueByDayRow = FinancialReport['revenueByDay'][number];

export function buildRevenueTableRows(report: FinancialReport): RevenueTableRow[] {
  const rows: RevenueTableRow[] = [];
  const prevByLoc = report.previousRevenueByDayByLocation;
  const prevByDate = new Map(
    (report.previousRevenueByDay ?? []).map((d) => [d.date, d] as const)
  );

  for (const loc of report.revenueByDayByLocation) {
    for (const day of loc.days) {
      const prev =
        report.revenueByDayByLocation.length > 1
          ? prevDayLookup(prevByLoc, loc.locationId, day.date)
          : prevByDate.get(day.date);
      const prevGross = prev?.gross ?? 0;
      const prevNet = prev?.net ?? 0;
      rows.push({
        id: `${loc.locationId}-${day.date}`,
        date: formatRevenueTableDate(day.date),
        dateIso: day.date,
        location: loc.name,
        gross: day.gross,
        prevGross,
        net: day.net,
        prevNet,
        orders: day.orders,
        avgCheck: day.orders > 0 ? Math.round((day.gross / day.orders) * 100) / 100 : 0,
      });
    }
  }

  return rows.sort((a, b) => b.dateIso.localeCompare(a.dateIso) || a.location.localeCompare(b.location));
}

export function grossRevenueGrowth(report: FinancialReport): number | null {
  if (!report.previousSummary) return null;
  return calcGrowthPercent(report.summary.grossRevenue, report.previousSummary.grossRevenue);
}
