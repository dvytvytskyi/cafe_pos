import type { FinancialReport } from '@/repositories/reports.repository';

export type PaymentBreakdown = {
  card: number;
  cash: number;
  app: number;
  total: number;
};

export type DashboardLocationMetrics = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  revenue: number;
  orderCount: number;
  avgTicket: number;
  reviewCount: number;
  reviewGrowth: number | null;
  signups: number;
  signupGrowth: number | null;
  activeTables: number;
  totalTables: number;
  staffOnDuty: number;
};

export type DashboardReview = {
  id: string;
  authorName: string;
  rating: number;
  comment: string | null;
  source: string;
  reviewDate: string;
};

export type DashboardShiftEntry = {
  userId: string;
  userName: string;
  position: string | null;
  avatarInitials: string | null;
  startTime: string;
  endTime: string;
  status: 'active' | 'offline';
};

export type LocationBreakdownRow = {
  locationId: string;
  name: string;
  gross: number;
  net: number;
  orders: number;
  avgTicket: number;
};

export type DashboardReport = FinancialReport & {
  previousSummary?: FinancialReport['summary'];
  previousRevenueByDay?: FinancialReport['revenueByDay'];
  revenueByLocation: LocationBreakdownRow[];
  previousRevenueByLocation?: LocationBreakdownRow[];
  revenueByDayByLocation: Array<{ locationId: string; name: string; days: FinancialReport['revenueByDay'] }>;
  paymentBreakdown: PaymentBreakdown;
  previousPaymentBreakdown?: PaymentBreakdown;
  hourlySales: { all: number[]; byLocation: Record<string, number[]> };
  previousHourlySales?: { all: number[]; byLocation: Record<string, number[]> };
  activeTables: {
    active: number;
    total: number;
    byLocation: Array<{ locationId: string; name: string; active: number; total: number }>;
  };
  locations: DashboardLocationMetrics[];
  recentReviews: DashboardReview[];
  shiftRoster: DashboardShiftEntry[];
  signups: {
    total: number;
    growth: number | null;
    byLocation: Array<{ locationId: string; name: string; count: number }>;
  };
  periodLabel: { start: string; end: string };
};

export const HOURLY_SLOTS = Array.from({ length: 15 }, (_, i) => i + 8);

export const LOCATION_COORDS: Record<string, { lat: number; lng: number }> = {
  eixample: { lat: 41.38763, lng: 2.157706 },
  gotico: { lat: 41.384142, lng: 2.172637 },
  gótico: { lat: 41.384142, lng: 2.172637 },
  arc: { lat: 41.388592, lng: 2.181591 },
  'arc de triomf': { lat: 41.388592, lng: 2.181591 },
  sagrada: { lat: 41.40579, lng: 2.169558 },
  'sagrada família': { lat: 41.40579, lng: 2.169558 },
  gracia: { lat: 41.403345, lng: 2.150875 },
  gràcia: { lat: 41.403345, lng: 2.150875 },
  default: { lat: 41.3874, lng: 2.1686 },
};

export function resolveLocationCoords(name: string, id: string): { lat: number; lng: number } {
  const normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
  for (const [key, coords] of Object.entries(LOCATION_COORDS)) {
    const nk = key.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized.includes(nk) || id === key) return coords;
  }
  return LOCATION_COORDS.default;
}

export function formatTimeAgo(date: Date, now = new Date()): string {
  const diffMs = now.getTime() - date.getTime();
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export function calcGrowthPercent(current: number, previous: number): number | null {
  if (previous <= 0) return current > 0 ? 100 : null;
  return Math.round(((current - previous) / previous) * 100);
}

export function previousPeriodRange(start: Date, end: Date): { startDate: Date; endDate: Date } {
  const startDay = new Date(start);
  startDay.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  const days = Math.round((endDay.getTime() - startDay.getTime()) / 86_400_000) + 1;

  const prevEnd = new Date(startDay);
  prevEnd.setDate(prevEnd.getDate() - 1);
  prevEnd.setHours(23, 59, 59, 999);

  const prevStart = new Date(prevEnd);
  prevStart.setDate(prevStart.getDate() - (days - 1));
  prevStart.setHours(0, 0, 0, 0);

  return { startDate: prevStart, endDate: prevEnd };
}

export function formatPeriodLabel(start: string, end: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso + 'T12:00:00');
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    return `${day}.${month}.${d.getFullYear()}`;
  };
  return `${fmt(start)} - ${fmt(end)}`;
}
