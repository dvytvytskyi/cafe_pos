'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { RevenueLineChart, PaymentGaugeChart } from '@/components/dashboard/SalesCharts';
import ActiveTablesCard from '@/components/dashboard/ActiveTablesCard';
import { ShiftRoster, RecentReviews, CategoryBreakdown } from '@/components/dashboard/DashboardWidgets';
import LocationsLeaderboard from '@/components/dashboard/LocationsLeaderboard';
import HourlySalesWidget from '@/components/dashboard/HourlySalesWidget';
import GlobalFilters from '@/components/dashboard/GlobalFilters';
import { getDashboardReportAsync, presetToDateRange } from '@/lib/reports';
import type { DateRangeValue } from '@/components/dashboard/GlobalFilters';
import type { DashboardPaymentFilter, DashboardReport } from '@/lib/dashboard';

function formatEuro(value: number): string {
  return `€${value.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function growthText(growth: number | null): string | null {
  if (growth === null) return null;
  const arrow = growth >= 0 ? '↑' : '↓';
  return `${arrow} ${Math.abs(growth)}% vs prev`;
}

export default function Home() {
  const [compare, setCompare] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeValue>(() => presetToDateRange('Last 7 days'));
  const [paymentMethod, setPaymentMethod] = useState<DashboardPaymentFilter>('all');
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [revenueViewMode, setRevenueViewMode] = useState<'total' | 'locations'>('total');
  const [ordersViewMode, setOrdersViewMode] = useState<'total' | 'locations'>('total');
  const [ticketViewMode, setTicketViewMode] = useState<'total' | 'locations'>('total');
  const [signupsViewMode, setSignupsViewMode] = useState<'total' | 'locations'>('total');

  const loadReport = useCallback(
    async (range: DateRangeValue, withCompare: boolean, payment: DashboardPaymentFilter) => {
      setLoading(true);
      try {
        const data = await getDashboardReportAsync({
          startDate: range.startDate,
          endDate: range.endDate,
          compare: withCompare,
          paymentMethod: payment,
        });
        setReport(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadReport(dateRange, compare, paymentMethod).catch(console.error);
  }, [dateRange, compare, paymentMethod, loadReport]);

  const smoothTransition = { type: 'spring', bounce: 0.05, duration: 0.5 } as const;
  const grossRevenue = report?.summary.grossRevenue ?? 0;
  const netRevenue = report?.summary.netRevenue ?? 0;
  const orderCount = report?.summary.orderCount ?? 0;
  const avgTicket = report?.summary.avgTicket ?? 0;
  const prevSummary = report?.previousSummary;
  const signupsTotal = report?.signups.total ?? 0;
  const signupGrowth = report?.signups.growth ?? null;

  return (
    <DashboardLayout>
      <div
        data-testid="home-page"
        className="bg-white rounded-3xl p-5 md:p-8 shadow-sm flex-1 min-h-0 min-w-0 flex flex-col overflow-hidden"
      >
        <div className="flex-shrink-0 min-w-0">
          <GlobalFilters
            compare={compare}
            onCompareChange={setCompare}
            onDateRangeChange={setDateRange}
            onPaymentMethodChange={setPaymentMethod}
          />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pb-10 min-h-0 min-w-0">
        {loading && !report && (
          <div className="text-sm text-gray-400 py-8 text-center">Loading dashboard…</div>
        )}

        <div className={`grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8 ${loading && !report ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex flex-col justify-between gap-6 xl:col-span-2 h-full">
            <div className="flex-1 border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">Revenue</h3>
                <div className="flex items-center gap-0.5 bg-gray-50/80 p-1 rounded-xl border border-gray-200/60">
                  <button
                    onClick={() => setRevenueViewMode('total')}
                    className={`cursor-pointer px-3 py-1 text-[12px] font-semibold rounded-lg transition-all ${revenueViewMode === 'total' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
                  >
                    Total
                  </button>
                  <button
                    onClick={() => setRevenueViewMode('locations')}
                    className={`cursor-pointer px-3 py-1 text-[12px] font-semibold rounded-lg transition-all ${revenueViewMode === 'locations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
                  >
                    By Location
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-6 mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm bg-corgi"></div>
                    <span className="text-sm font-medium text-gray-500">Gross Volume</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900" data-testid="home-kpi-gross">
                      {formatEuro(grossRevenue)}
                    </span>
                    <span className="text-xs font-bold text-green-500">live from API</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm bg-gray-200"></div>
                    <span className="text-sm font-medium text-gray-500">Net Volume</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900" data-testid="home-kpi-net">
                      {formatEuro(netRevenue)}
                    </span>
                  </div>
                </div>

                {compare && prevSummary && (
                  <>
                    <div className="border-l border-gray-100 pl-6 hidden sm:block h-10"></div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 2px, #fef3c7 2px, #fef3c7 4px)',
                          }}
                        ></div>
                        <span className="text-sm font-medium text-gray-500">Gross (Prev)</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-gray-500">{formatEuro(prevSummary.grossRevenue)}</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{
                            backgroundImage:
                              'repeating-linear-gradient(45deg, #d1d5db, #d1d5db 2px, #f3f4f6 2px, #f3f4f6 4px)',
                          }}
                        ></div>
                        <span className="text-sm font-medium text-gray-500">Net (Prev)</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-gray-500">{formatEuro(prevSummary.netRevenue)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1">
                <RevenueLineChart
                  compare={compare}
                  viewMode={revenueViewMode}
                  revenueByDay={report?.revenueByDay}
                  previousRevenueByDay={report?.previousRevenueByDay}
                  revenueByDayByLocation={report?.revenueByDayByLocation}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <motion.div layout transition={smoothTransition} className="border border-gray-100 rounded-3xl p-6 hover:border-gray-200 transition-colors bg-white flex flex-col justify-between overflow-hidden">
                <motion.div layout transition={smoothTransition} className="flex flex-col items-start gap-3 mb-2">
                  <div className="text-gray-500 text-sm font-medium leading-tight pt-0.5">Total Orders</div>
                  <div className="flex-shrink-0 flex items-center gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-200/60">
                    <button onClick={() => setOrdersViewMode('total')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${ordersViewMode === 'total' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Total</button>
                    <button onClick={() => setOrdersViewMode('locations')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${ordersViewMode === 'locations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Locations</button>
                  </div>
                </motion.div>
                <AnimatePresence mode="popLayout" initial={false}>
                  {ordersViewMode === 'total' ? (
                    <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="text-2xl font-black text-gray-900" data-testid="home-kpi-orders">
                        {orderCount.toLocaleString('en-GB')}
                      </div>
                      <div className="text-xs font-bold text-green-500 mt-2">live from API</div>
                    </motion.div>
                  ) : (
                    <motion.div key="locations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-1.5 mt-2 flex-1 justify-center">
                      {(report?.revenueByLocation ?? []).map((loc) => (
                        <div key={loc.locationId} className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">{loc.name}</span>
                          <span className="text-xs font-bold text-gray-900">{loc.orders}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                {compare && ordersViewMode === 'total' && prevSummary && (
                  <motion.div layout transition={smoothTransition} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Previous period</span>
                    <span className="text-sm font-bold text-gray-500">{prevSummary.orderCount.toLocaleString('en-GB')}</span>
                  </motion.div>
                )}
              </motion.div>

              <motion.div layout transition={smoothTransition} className="border border-gray-100 rounded-3xl p-6 hover:border-gray-200 transition-colors bg-white flex flex-col justify-between overflow-hidden">
                <motion.div layout transition={smoothTransition} className="flex flex-col items-start gap-3 mb-2">
                  <div className="text-gray-500 text-sm font-medium leading-tight pt-0.5">Avg. Ticket Size</div>
                  <div className="flex-shrink-0 flex items-center gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-200/60">
                    <button onClick={() => setTicketViewMode('total')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${ticketViewMode === 'total' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Total</button>
                    <button onClick={() => setTicketViewMode('locations')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${ticketViewMode === 'locations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Locations</button>
                  </div>
                </motion.div>
                <AnimatePresence mode="popLayout" initial={false}>
                  {ticketViewMode === 'total' ? (
                    <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="text-2xl font-black text-gray-900" data-testid="home-kpi-avg-ticket">
                        {formatEuro(avgTicket)}
                      </div>
                      <div className="text-xs font-bold text-green-500 mt-2">live from API</div>
                    </motion.div>
                  ) : (
                    <motion.div key="locations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-1.5 mt-2 flex-1 justify-center">
                      {(report?.revenueByLocation ?? []).map((loc) => (
                        <div key={loc.locationId} className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">{loc.name}</span>
                          <span className="text-xs font-bold text-gray-900">{formatEuro(loc.avgTicket)}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
                {compare && ticketViewMode === 'total' && prevSummary && (
                  <motion.div layout transition={smoothTransition} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Previous period</span>
                    <span className="text-sm font-bold text-gray-500">{formatEuro(prevSummary.avgTicket)}</span>
                  </motion.div>
                )}
              </motion.div>

              <motion.div layout transition={smoothTransition} className="border border-gray-100 rounded-3xl p-6 hover:border-gray-200 transition-colors bg-white flex flex-col justify-between overflow-hidden">
                <motion.div layout transition={smoothTransition} className="flex flex-col items-start gap-3 mb-2">
                  <div className="text-gray-500 text-sm font-medium leading-tight pt-0.5">New App Signups</div>
                  <div className="flex-shrink-0 flex items-center gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-200/60">
                    <button onClick={() => setSignupsViewMode('total')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${signupsViewMode === 'total' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Total</button>
                    <button onClick={() => setSignupsViewMode('locations')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${signupsViewMode === 'locations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Locations</button>
                  </div>
                </motion.div>
                <AnimatePresence mode="popLayout" initial={false}>
                  {signupsViewMode === 'total' ? (
                    <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="text-2xl font-black text-gray-900">{signupsTotal}</div>
                      {growthText(signupGrowth) && (
                        <div className="text-xs font-bold text-green-500 mt-2">{growthText(signupGrowth)}</div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div key="locations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-1.5 mt-2 flex-1 justify-center">
                      {(report?.signups.byLocation ?? []).map((loc) => (
                        <div key={loc.locationId} className="flex justify-between items-center">
                          <span className="text-xs text-gray-500">{loc.name}</span>
                          <span className="text-xs font-bold text-gray-900">{loc.count}</span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>

          <div className="flex flex-col gap-6 xl:col-span-1">
            <motion.div layout transition={smoothTransition} className="border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white overflow-hidden">
              <motion.h3 layout transition={smoothTransition} className="text-lg font-bold text-gray-900 mb-4">
                Revenue by Payment Method
              </motion.h3>
              <motion.div layout transition={smoothTransition} className="hidden xl:block h-[52px] mb-6"></motion.div>
              <motion.div layout transition={smoothTransition} className="flex flex-col items-center justify-center flex-1 w-full">
                <PaymentGaugeChart
                  compare={compare}
                  breakdown={report?.paymentBreakdown}
                  previousBreakdown={report?.previousPaymentBreakdown}
                  periodLabel={report?.periodLabel}
                />
              </motion.div>
            </motion.div>

            <motion.div layout transition={smoothTransition}>
              <ActiveTablesCard data={report?.activeTables} />
            </motion.div>
          </div>
        </div>

        <LocationsLeaderboard compare={compare} locations={report?.locations} />

        <HourlySalesWidget
          compare={compare}
          hourlySales={report?.hourlySales}
          previousHourlySales={report?.previousHourlySales}
          locations={report?.locations}
        />

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <ShiftRoster roster={report?.shiftRoster} />
          <RecentReviews reviews={report?.recentReviews} />
          <CategoryBreakdown dishes={report?.dishes} />
        </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
