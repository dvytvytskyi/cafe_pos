import type { FinancialReport } from '../repositories/reports.repository';
import type { DashboardReport } from './dashboard';

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
}): Promise<FinancialReport> {
  const qs = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    locationId: params.locationId ?? 'default',
  });
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
}): Promise<DashboardReport> {
  const qs = new URLSearchParams({
    startDate: params.startDate,
    endDate: params.endDate,
    locationId: 'default',
  });
  if (params.compare) qs.set('compare', 'true');
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
