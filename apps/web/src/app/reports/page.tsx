'use client';

import React, { useCallback, useEffect, useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import GlobalFilters from '@/components/dashboard/GlobalFilters';
import { RevenueLineChart } from '@/components/dashboard/SalesCharts';
import { RevenueTable } from '@/components/reports/RevenueTable';
import { StaffPerformanceTables } from '@/components/reports/StaffPerformanceTables';
import { DishPerformanceTables } from '@/components/reports/DishPerformanceTables';
import { FinancialSummaries } from '@/components/reports/FinancialSummaries';
import { Download, Check, ChevronDown, Loader2 } from 'lucide-react';
import { getFinancialReportAsync, presetToDateRange } from '@/lib/reports';
import type { DateRangeValue } from '@/components/dashboard/GlobalFilters';
import { buildFinancialCsv } from '@/lib/reports-financial';
import type { FinancialReport } from '@/repositories/reports.repository';

export default function ReportsPage() {
  const [compare, setCompare] = useState(false);
  const [revenueView, setRevenueView] = useState<'chart'|'table'>('chart');
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => presetToDateRange('Last 7 days'));
  const [report, setReport] = useState<FinancialReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  
  const [locationOpen, setLocationOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState('All Branches');
  
  const locations = [
    'All Branches',
    'Eixample',
    'Gótico',
    'Arc de Triomf',
    'Sagrada Família',
    'Gràcia'
  ];

  const loadReport = useCallback(async (range: DateRangeValue) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = await getFinancialReportAsync({
        startDate: range.startDate,
        endDate: range.endDate,
      });
      setReport(data);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadReport(dateRange).catch(console.error);
  }, [dateRange, loadReport]);

  const handleExportCSV = () => {
    if (!report) return;
    const csv = buildFinancialCsv(report);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `corgi_cafe_reports_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout>
      <div
        data-testid="reports-page"
        className="bg-white rounded-3xl p-5 md:p-8 shadow-sm flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden"
      >
        <div className="flex-shrink-0 mb-6 min-w-0">
        <GlobalFilters compare={compare} onCompareChange={setCompare} variant="reports" onDateRangeChange={setDateRange}>
          <button 
            data-testid="reports-export-csv"
            onClick={handleExportCSV}
            disabled={!report}
            className="flex items-center justify-center gap-2 bg-white border border-gray-100 hover:border-gray-200 text-gray-700 font-bold text-[13px] rounded-xl px-4 py-2 h-[40px] transition-colors cursor-pointer whitespace-nowrap disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-gray-400" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          {/* Location Selector (Custom Dark Modal) */}
          <div className="relative">
            <button 
              onClick={() => setLocationOpen(!locationOpen)}
              className="flex items-center gap-2 bg-white border border-gray-100 hover:border-gray-200 text-gray-700 font-bold text-[13px] rounded-xl pl-4 pr-3 py-2 h-[40px] transition-colors cursor-pointer"
            >
              <span>{selectedLocation}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>

            {locationOpen && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setLocationOpen(false)}
                />
                <div className="absolute right-0 top-full mt-2 w-48 bg-[#525252] rounded-xl shadow-lg py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {locations.map((loc) => (
                    <button
                      key={loc}
                      onClick={() => {
                        setSelectedLocation(loc);
                        setLocationOpen(false);
                      }}
                      className="w-full flex items-center px-4 py-2 hover:bg-white/10 transition-colors text-left text-[14px] text-white font-medium group"
                    >
                      <div className="w-5 flex justify-center mr-1">
                        {selectedLocation === loc && (
                          <Check className="w-4 h-4 text-white" />
                        )}
                      </div>
                      {loc}
                    </button>
                  ))}
                </div>
              </>
            )}
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

        {/* Revenue Comparison Widget */}
        <div className="border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
            <div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Revenue Comparison</h3>
              <p className="text-sm font-medium text-gray-500 mt-1">Analyze sales across periods and locations.</p>
            </div>
            <button 
              onClick={() => setRevenueView(revenueView === 'chart' ? 'table' : 'chart')}
              className="flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 border border-gray-100 hover:border-gray-200 text-gray-700 rounded-xl font-bold text-[13px] transition-colors cursor-pointer"
            >
              {revenueView === 'chart' ? (
                <>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                  <span>Open in Table</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Show Chart</span>
                </>
              )}
            </button>
          </div>
          
          {/* Chart Summary Stats */}
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
                    €{(report?.summary.grossRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-sm font-bold text-green-500 bg-green-50 px-2 py-0.5 rounded-md">↑ 3.12%</span>
                </div>
              </div>
              
              {compare && (
                <>
                  <div className="w-px h-12 bg-gray-100 hidden sm:block"></div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-3 h-3 rounded-sm" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 2px, #fef3c7 2px, #fef3c7 4px)' }}></div>
                      <span className="text-sm font-bold text-gray-500">Gross (Prev Period)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-gray-400 tracking-tight">€46,800</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="flex-1 min-h-[300px] transition-all duration-500 ease-in-out">
            {revenueView === 'chart' ? (
              <div className="h-full animate-in fade-in zoom-in-95 duration-300">
                <RevenueLineChart compare={compare} viewMode="locations" grossOnly={true} />
              </div>
            ) : (
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                <RevenueTable compare={compare} />
              </div>
            )}
          </div>
        </div>



        {/* Dish Performance (Full Width Grouped Tables) */}
        <div className="w-full">
          <DishPerformanceTables dishes={report?.dishes ?? []} />
        </div>

        {/* Staff Performance (Full Width Grouped Tables) */}
        <div className="w-full">
          <StaffPerformanceTables />
        </div>

        {/* Financial Summaries & VERI*FACTU Ledger */}
        <div className="w-full">
          <FinancialSummaries report={report} />
        </div>

        </div>
      </div>
    </DashboardLayout>
  );
}


