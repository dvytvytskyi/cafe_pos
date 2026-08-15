'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlobalFilters from '@/components/dashboard/GlobalFilters';
import AnchoredDropdown from '@/components/dashboard/AnchoredDropdown';
import { RevenueLineChart } from '@/components/dashboard/SalesCharts';
import { RevenueTable } from '@/components/reports/RevenueTable';
import { StaffPerformanceTables } from '@/components/reports/StaffPerformanceTables';
import { DishPerformanceTables } from '@/components/reports/DishPerformanceTables';
import { FinancialSummaries } from '@/components/reports/FinancialSummaries';
import { Download, Check, ChevronDown, Loader2 } from 'lucide-react';
import {
  buildRevenueTableRows,
  clampDateRangeToToday,
  formatActivePeriodLabel,
  getFinancialReportAsync,
  grossRevenueGrowth,
  prepareChartRevenueByDay,
  prepareChartRevenueByLocation,
  presetToDateRange,
  previousPeriodDateRange,
  shouldAggregateChartByWeek,
} from '@/lib/reports';
import type { DateRangeValue } from '@/components/dashboard/GlobalFilters';
import { buildFinancialCsv } from '@/lib/reports-financial';
import type { FinancialReport } from '@/repositories/reports.repository';
import { getLocationsCachedAsync, type LocationSummary } from '@/lib/locations';
import type { DashboardPaymentFilter } from '@/lib/dashboard';
import { PAYMENT_FILTER_LABELS } from '@/lib/dashboard';

const ALL_BRANCHES = 'All Branches';

function isReportLocation(name: string): boolean {
  return !/\btest\b/i.test(name);
}

function formatEuro(value: number): string {
  return `€${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function growthBadge(growth: number | null): React.ReactNode {
  if (growth === null) return null;
  const positive = growth >= 0;
  return (
    <span
      className={`text-sm font-bold px-2 py-0.5 rounded-md ${
        positive ? 'text-green-500 bg-green-50' : 'text-red-500 bg-red-50'
      }`}
    >
      {positive ? '↑' : '↓'} {Math.abs(growth)}%
    </span>
  );
}

export default function ReportsPage() {
  const [compare, setCompare] = useState(false);
  const [revenueView, setRevenueView] = useState<'chart' | 'table'>('chart');
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => presetToDateRange('Last 7 days'));
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState(ALL_BRANCHES);
  const [locations, setLocations] = useState<LocationSummary[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<DashboardPaymentFilter>('all');
  const locationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getLocationsCachedAsync()
      .then((rows) => setLocations(rows.filter((l) => isReportLocation(l.name))))
      .catch(() => {});
  }, []);

  const effectiveRange = useMemo(() => clampDateRangeToToday(dateRange), [dateRange]);
  const chartWeekly = shouldAggregateChartByWeek(effectiveRange);
  const activePeriodLabel = formatActivePeriodLabel(effectiveRange);
  const comparePeriodLabel = compare
    ? formatActivePeriodLabel(previousPeriodDateRange(effectiveRange))
    : null;

  const locationOptions = useMemo(
    () => [ALL_BRANCHES, ...locations.map((l) => l.name)],
    [locations]
  );

  const selectedLocationId = useMemo(() => {
    if (selectedLocation === ALL_BRANCHES) return 'all';
    return locations.find((l) => l.name === selectedLocation)?.id ?? 'all';
  }, [selectedLocation, locations]);

  const isAllLocations = selectedLocationId === 'all';

  const loadReport = useCallback(
    async (
      range: DateRangeValue,
      locationId: string,
      withCompare: boolean,
      payment: DashboardPaymentFilter
    ) => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = await getFinancialReportAsync({
          startDate: range.startDate,
          endDate: range.endDate,
          locationId,
          compare: withCompare,
          paymentMethod: payment,
        });
        setReport(data);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load report');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadReport(effectiveRange, selectedLocationId, compare, paymentMethod).catch(console.error);
  }, [effectiveRange, selectedLocationId, compare, paymentMethod, loadReport]);

  const chartRevenueByDay = useMemo(
    () => prepareChartRevenueByDay(report?.revenueByDay, effectiveRange),
    [report?.revenueByDay, effectiveRange]
  );
  const chartPreviousRevenueByDay = useMemo(
    () => prepareChartRevenueByDay(report?.previousRevenueByDay, effectiveRange),
    [report?.previousRevenueByDay, effectiveRange]
  );
  const chartRevenueByLocation = useMemo(
    () => prepareChartRevenueByLocation(report?.revenueByDayByLocation, effectiveRange),
    [report?.revenueByDayByLocation, effectiveRange]
  );

  const revenueTableRows = useMemo(
    () => (report ? buildRevenueTableRows(report) : []),
    [report]
  );

  const revenueGrowth = report ? grossRevenueGrowth(report) : null;

  const paymentLabel =
    PAYMENT_FILTER_LABELS.find(
      (label) =>
        (label === 'Card' && paymentMethod === 'card') ||
        (label === 'Cash' && paymentMethod === 'cash') ||
        (label === 'App' && paymentMethod === 'app') ||
        (label === 'All Methods' && paymentMethod === 'all')
    ) ?? 'All Methods';

  const handleExportCSV = () => {
    if (!report) return;
    const csv = buildFinancialCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `corgi_cafe_reports_${effectiveRange.startDate}_${effectiveRange.endDate}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <DashboardLayout>
      <div
        data-testid="reports-page"
        className="bg-white rounded-3xl p-5 md:p-8 shadow-sm flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden"
      >
        <div className="flex-shrink-0 mb-6 min-w-0">
          <GlobalFilters
            compare={compare}
            onCompareChange={setCompare}
            variant="reports"
            onDateRangeChange={setDateRange}
            onPaymentMethodChange={setPaymentMethod}
          >
            <button
              type="button"
              data-testid="reports-export-csv"
              onClick={handleExportCSV}
              disabled={!report || loading}
              className="flex items-center justify-center gap-2 bg-white border border-gray-100 hover:border-gray-200 text-gray-700 font-bold text-[13px] rounded-xl px-4 py-2 h-[40px] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4 text-gray-400" />
              <span className="hidden sm:inline">Export CSV</span>
            </button>

            <div className="relative" ref={locationRef}>
              <button
                type="button"
                onClick={() => setLocationOpen((open) => !open)}
                className="flex items-center gap-2 bg-white border border-gray-100 hover:border-gray-200 text-gray-700 font-bold text-[13px] rounded-xl pl-4 pr-3 py-2 h-[40px] transition-colors cursor-pointer"
              >
                <span>{selectedLocation}</span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${locationOpen ? 'rotate-180' : ''}`} />
              </button>

              <AnchoredDropdown
                open={locationOpen}
                onClose={() => setLocationOpen(false)}
                anchorRef={locationRef}
                align="right"
                width={192}
                className="bg-[#525252] rounded-xl shadow-lg py-2"
              >
                {locationOptions.map((loc) => (
                  <button
                    key={loc}
                    type="button"
                    onClick={() => {
                      setSelectedLocation(loc);
                      setLocationOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 hover:bg-white/10 transition-colors text-left text-[14px] text-white font-medium"
                  >
                    <div className="w-5 flex justify-center mr-1">
                      {selectedLocation === loc && <Check className="w-4 h-4 text-white" />}
                    </div>
                    {loc}
                  </button>
                ))}
              </AnchoredDropdown>
            </div>
          </GlobalFilters>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-10 min-h-0 min-w-0 flex flex-col gap-6">
          {loadError && (
            <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium">
              {loadError}
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="animate-spin mr-2" size={20} />
              Loading financial report…
            </div>
          )}

          <div className="border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
              <div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight">Revenue Comparison</h3>
                <p className="text-sm font-medium text-gray-500 mt-1">
                  {activePeriodLabel}
                  {selectedLocation !== ALL_BRANCHES ? ` · ${selectedLocation}` : ' · All Branches'}
                  {paymentMethod !== 'all' ? ` · ${paymentLabel}` : ''}
                  {comparePeriodLabel ? ` · vs ${comparePeriodLabel}` : ''}
                  {chartWeekly ? ' · Weekly view' : ''}
                </p>
              </div>
              <button
                onClick={() => setRevenueView(revenueView === 'chart' ? 'table' : 'chart')}
                className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 text-gray-700 rounded-xl font-bold text-[13px] transition-colors cursor-pointer"
              >
                {revenueView === 'chart' ? (
                  <>
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4 6h16M4 10h16M4 14h16M4 18h16"
                      />
                    </svg>
                    <span>Open in Table</span>
                  </>
                ) : (
                  <>
                    <svg
                      className="w-4 h-4 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                      />
                    </svg>
                    <span>Show Chart</span>
                  </>
                )}
              </button>
            </div>

            {revenueView === 'chart' && (
              <div className="flex flex-wrap items-center gap-8 mb-6 animate-in fade-in duration-300">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm bg-corgi"></div>
                    <span className="text-sm font-bold text-gray-500">Gross Volume</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span
                      data-testid="reports-gross-volume"
                      className="text-3xl font-black text-gray-900 tracking-tight"
                    >
                      {formatEuro(report?.summary.grossRevenue ?? 0)}
                    </span>
                    {compare && growthBadge(revenueGrowth)}
                  </div>
                </div>

                {compare && report?.previousSummary && (
                  <>
                    <div className="w-px h-12 bg-gray-100 hidden sm:block"></div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 2px, #fef3c7 2px, #fef3c7 4px)',
                          }}
                        ></div>
                        <span className="text-sm font-bold text-gray-500">Gross (Prev Period)</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-black text-gray-400 tracking-tight">
                          {formatEuro(report.previousSummary.grossRevenue)}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="flex-1 min-h-[300px] transition-all duration-500 ease-in-out">
              {revenueView === 'chart' ? (
                <div className="h-full animate-in fade-in zoom-in-95 duration-300">
                  <RevenueLineChart
                    compare={compare}
                    viewMode={isAllLocations ? 'locations' : 'total'}
                    grossOnly={true}
                    weekly={chartWeekly}
                    revenueByDay={chartRevenueByDay}
                    previousRevenueByDay={chartPreviousRevenueByDay}
                    revenueByDayByLocation={chartRevenueByLocation}
                  />
                </div>
              ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <RevenueTable compare={compare} rows={revenueTableRows} />
                </div>
              )}
            </div>
          </div>

          <div className="w-full">
            <DishPerformanceTables dishes={report?.dishes ?? []} />
          </div>

          <div className="w-full">
            <StaffPerformanceTables staffByLocation={report?.staffByLocation ?? []} />
          </div>

          <div className="w-full">
            <FinancialSummaries report={report} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
