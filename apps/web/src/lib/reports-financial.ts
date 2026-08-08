export const DEFAULT_TAX_RATE = 0.1;

export type AbcClass = 'A' | 'B' | 'C';

export type DishRevenueRow = {
  name: string;
  category: string;
  revenue: number;
  quantity: number;
};

export type DishAbcRow = DishRevenueRow & {
  abcClass: AbcClass;
  cumulativePercent: number;
};

export type FinancialSummaryMetrics = {
  grossRevenue: number;
  netRevenue: number;
  taxTotal: number;
  avgTicket: number;
  orderCount: number;
  voidCount: number;
  voidAmount: number;
};

export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

export function calculateFinancialMetrics(
  orders: Array<{ total: number; status: string; paid: boolean }>,
  taxRate = DEFAULT_TAX_RATE
): FinancialSummaryMetrics {
  const completed = orders.filter((o) => o.paid || o.status === 'completed');
  const voided = orders.filter((o) => o.status === 'cancelled');

  const grossRevenue = roundMoney(completed.reduce((sum, o) => sum + o.total, 0));
  const taxTotal = roundMoney(grossRevenue - grossRevenue / (1 + taxRate));
  const netRevenue = roundMoney(grossRevenue - taxTotal);
  const orderCount = completed.length;
  const avgTicket = orderCount > 0 ? roundMoney(grossRevenue / orderCount) : 0;
  const voidCount = voided.length;
  const voidAmount = roundMoney(voided.reduce((sum, o) => sum + o.total, 0));

  return { grossRevenue, netRevenue, taxTotal, avgTicket, orderCount, voidCount, voidAmount };
}

export function classifyAbcAnalysis(dishes: DishRevenueRow[]): DishAbcRow[] {
  if (dishes.length === 0) return [];

  const sorted = [...dishes].sort((a, b) => b.revenue - a.revenue);
  const totalRevenue = sorted.reduce((sum, d) => sum + d.revenue, 0);
  if (totalRevenue <= 0) {
    return sorted.map((d) => ({ ...d, abcClass: 'C' as AbcClass, cumulativePercent: 100 }));
  }

  let cumulative = 0;
  return sorted.map((d) => {
    cumulative += d.revenue;
    const cumulativePercent = roundMoney((cumulative / totalRevenue) * 100);
    let abcClass: AbcClass = 'C';
    const prevCumulative = cumulative - d.revenue;
    const prevPercent = (prevCumulative / totalRevenue) * 100;
    if (prevPercent < 80) abcClass = 'A';
    else if (prevPercent < 95) abcClass = 'B';
    return { ...d, abcClass, cumulativePercent };
  });
}

export function buildFinancialCsv(report: {
  summary: FinancialSummaryMetrics;
  revenueByDay: Array<{ date: string; gross: number; orders: number }>;
  dishes: DishAbcRow[];
}): string {
  const lines = ['Report Type,Metric,Value,Date'];
  const today = new Date().toISOString().slice(0, 10);
  lines.push(`Financial,Gross Revenue,${report.summary.grossRevenue.toFixed(2)},${today}`);
  lines.push(`Financial,Net Revenue,${report.summary.netRevenue.toFixed(2)},${today}`);
  lines.push(`Financial,Tax Total,${report.summary.taxTotal.toFixed(2)},${today}`);
  lines.push(`Financial,Avg Ticket,${report.summary.avgTicket.toFixed(2)},${today}`);
  lines.push(`Financial,Order Count,${report.summary.orderCount},${today}`);

  for (const row of report.revenueByDay) {
    lines.push(`Revenue,${row.date},${row.gross.toFixed(2)},${row.date}`);
  }
  for (const dish of report.dishes) {
    lines.push(`Dishes,${dish.name} (${dish.abcClass}),${dish.revenue.toFixed(2)},${today}`);
  }
  return lines.join('\n');
}
