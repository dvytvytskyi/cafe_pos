'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { RevenueLineChart, PaymentGaugeChart } from '@/components/dashboard/SalesCharts';
import ActiveTablesCard from '@/components/dashboard/ActiveTablesCard';
import { ShiftRoster, RecentReviews, CategoryBreakdown } from '@/components/dashboard/DashboardWidgets';
import LocationsLeaderboard from '@/components/dashboard/LocationsLeaderboard';
import HourlySalesWidget from '@/components/dashboard/HourlySalesWidget';
import GlobalFilters from '@/components/dashboard/GlobalFilters';

export default function Home() {
  const [compare, setCompare] = useState(false);
  const [revenueViewMode, setRevenueViewMode] = useState<'total' | 'locations'>('total');
  const [ordersViewMode, setOrdersViewMode] = useState<'total' | 'locations'>('total');
  const [ticketViewMode, setTicketViewMode] = useState<'total' | 'locations'>('total');
  const [signupsViewMode, setSignupsViewMode] = useState<'total' | 'locations'>('total');

  const smoothTransition = { type: 'spring', bounce: 0.05, duration: 0.5 } as any;

  return (
    <DashboardLayout>
      <div className="bg-white rounded-3xl p-5 md:p-8 shadow-sm flex-1 overflow-y-auto pb-10">
        
        {/* Global Filters Bar */}
        <GlobalFilters compare={compare} onCompareChange={setCompare} />

        {/* Charts Section (Side by side, 66% / 33%) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Left Column (Chart + Scorecards) */}
          <div className="flex flex-col justify-between gap-6 lg:col-span-2 h-full">
            {/* Left Chart: Revenue */}
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
                    <span className="text-2xl font-bold text-gray-900">€48,580</span>
                    <span className="text-xs font-bold text-green-500">↑ 3.12% last week</span>
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-3 h-3 rounded-sm bg-gray-200"></div>
                    <span className="text-sm font-medium text-gray-500">Net Volume</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-gray-900">€29,540</span>
                    <span className="text-xs font-bold text-green-500">↑ 1.54% last week</span>
                  </div>
                </div>
                
                {compare && (
                  <>
                    <div className="border-l border-gray-100 pl-6 hidden sm:block h-10"></div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #f59e0b, #f59e0b 2px, #fef3c7 2px, #fef3c7 4px)' }}></div>
                        <span className="text-sm font-medium text-gray-500">Gross (Prev)</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-gray-500">€46,800</span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-3 h-3 rounded-sm" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #d1d5db, #d1d5db 2px, #f3f4f6 2px, #f3f4f6 4px)' }}></div>
                        <span className="text-sm font-medium text-gray-500">Net (Prev)</span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xl font-bold text-gray-500">€28,500</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className="flex-1">
                <RevenueLineChart compare={compare} viewMode={revenueViewMode} />
              </div>
            </div>

            {/* Scorecards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Total Orders */}
              <motion.div layout transition={smoothTransition} className="border border-gray-100 rounded-3xl p-6 hover:border-gray-200 transition-colors bg-white flex flex-col justify-between overflow-hidden">
                <motion.div layout transition={smoothTransition} className="flex justify-between items-start mb-2">
                  <div className="text-gray-500 text-sm font-medium">Total Orders</div>
                  <div className="flex items-center gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-200/60">
                    <button onClick={() => setOrdersViewMode('total')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${ordersViewMode === 'total' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Total</button>
                    <button onClick={() => setOrdersViewMode('locations')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${ordersViewMode === 'locations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Locations</button>
                  </div>
                </motion.div>
                <AnimatePresence mode="popLayout" initial={false}>
                  {ordersViewMode === 'total' ? (
                    <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="text-2xl font-black text-gray-900">1,248</div>
                      <div className="text-xs font-bold text-green-500 mt-2">↑ 12.5% this week</div>
                    </motion.div>
                  ) : (
                    <motion.div key="locations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-1.5 mt-2 flex-1 justify-center">
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Eixample</span><span className="text-xs font-bold text-gray-900">420</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Gótico</span><span className="text-xs font-bold text-gray-900">310</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Arc de Triomf</span><span className="text-xs font-bold text-gray-900">258</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Sagrada Família</span><span className="text-xs font-bold text-gray-900">160</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Gràcia</span><span className="text-xs font-bold text-gray-900">100</span></div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {compare && ordersViewMode === 'total' && (
                  <motion.div layout transition={smoothTransition} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Previous period</span>
                    <span className="text-sm font-bold text-gray-500">1,109</span>
                  </motion.div>
                )}
              </motion.div>
              
              {/* Avg. Ticket Size */}
              <motion.div layout transition={smoothTransition} className="border border-gray-100 rounded-3xl p-6 hover:border-gray-200 transition-colors bg-white flex flex-col justify-between overflow-hidden">
                <motion.div layout transition={smoothTransition} className="flex justify-between items-start mb-2">
                  <div className="text-gray-500 text-sm font-medium">Avg. Ticket Size</div>
                  <div className="flex items-center gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-200/60">
                    <button onClick={() => setTicketViewMode('total')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${ticketViewMode === 'total' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Total</button>
                    <button onClick={() => setTicketViewMode('locations')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${ticketViewMode === 'locations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Locations</button>
                  </div>
                </motion.div>
                <AnimatePresence mode="popLayout" initial={false}>
                  {ticketViewMode === 'total' ? (
                    <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="text-2xl font-black text-gray-900">€14.50</div>
                      <div className="text-xs font-bold text-green-500 mt-2">↑ 5.2% this week</div>
                    </motion.div>
                  ) : (
                    <motion.div key="locations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-1.5 mt-2 flex-1 justify-center">
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Eixample</span><span className="text-xs font-bold text-gray-900">€15.20</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Gótico</span><span className="text-xs font-bold text-gray-900">€14.80</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Arc de Triomf</span><span className="text-xs font-bold text-gray-900">€14.50</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Sagrada Família</span><span className="text-xs font-bold text-gray-900">€14.10</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Gràcia</span><span className="text-xs font-bold text-gray-900">€13.90</span></div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {compare && ticketViewMode === 'total' && (
                  <motion.div layout transition={smoothTransition} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Previous period</span>
                    <span className="text-sm font-bold text-gray-500">€13.78</span>
                  </motion.div>
                )}
              </motion.div>
              
              {/* New App Signups */}
              <motion.div layout transition={smoothTransition} className="border border-gray-100 rounded-3xl p-6 hover:border-gray-200 transition-colors bg-white flex flex-col justify-between overflow-hidden">
                <motion.div layout transition={smoothTransition} className="flex justify-between items-start mb-2">
                  <div className="text-gray-500 text-sm font-medium">New App Signups</div>
                  <div className="flex items-center gap-0.5 bg-gray-50/80 p-0.5 rounded-lg border border-gray-200/60">
                    <button onClick={() => setSignupsViewMode('total')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${signupsViewMode === 'total' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Total</button>
                    <button onClick={() => setSignupsViewMode('locations')} className={`cursor-pointer px-2 py-0.5 text-[10px] font-semibold rounded-md transition-all ${signupsViewMode === 'locations' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}>Locations</button>
                  </div>
                </motion.div>
                <AnimatePresence mode="popLayout" initial={false}>
                  {signupsViewMode === 'total' ? (
                    <motion.div key="total" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                      <div className="text-2xl font-black text-gray-900">142</div>
                      <div className="text-xs font-bold text-green-500 mt-2">↑ 24% this week</div>
                    </motion.div>
                  ) : (
                    <motion.div key="locations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="flex flex-col gap-1.5 mt-2 flex-1 justify-center">
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Eixample</span><span className="text-xs font-bold text-gray-900">52</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Gótico</span><span className="text-xs font-bold text-gray-900">38</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Arc de Triomf</span><span className="text-xs font-bold text-gray-900">24</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Sagrada Família</span><span className="text-xs font-bold text-gray-900">18</span></div>
                      <div className="flex justify-between items-center"><span className="text-xs text-gray-500">Gràcia</span><span className="text-xs font-bold text-gray-900">10</span></div>
                    </motion.div>
                  )}
                </AnimatePresence>
                {compare && signupsViewMode === 'total' && (
                  <motion.div layout transition={smoothTransition} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-400">Previous period</span>
                    <span className="text-sm font-bold text-gray-500">114</span>
                  </motion.div>
                )}
              </motion.div>
            </div>
          </div>
          
          {/* Right Column */}
          <div className="flex flex-col justify-between gap-6 lg:col-span-1 h-full">
            {/* Right Chart: Payment Distribution */}
            <motion.div layout transition={smoothTransition} className="flex-1 border border-gray-100 rounded-3xl p-6 flex flex-col hover:border-gray-200 transition-colors bg-white overflow-hidden">
              <motion.h3 layout transition={smoothTransition} className="text-lg font-bold text-gray-900 mb-4">Revenue by Payment Method</motion.h3>
              {/* Invisible spacer to match the height of the Gross/Net Volume block on the left */}
              <motion.div layout transition={smoothTransition} className="hidden lg:block h-[52px] mb-6"></motion.div>
              <motion.div layout transition={smoothTransition} className="flex-1 flex items-end justify-center">
                <PaymentGaugeChart compare={compare} />
              </motion.div>
            </motion.div>

            {/* Active Tables Highlight Card */}
            <motion.div layout transition={smoothTransition}>
              <ActiveTablesCard />
            </motion.div>
          </div>
        </div>

        {/* Locations Leaderboard (Network View) */}
        <LocationsLeaderboard compare={compare} />

        {/* Hourly Sales Widget */}
        <HourlySalesWidget compare={compare} />

        {/* Bottom Widgets Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <ShiftRoster />
          <RecentReviews />
          <CategoryBreakdown />
        </div>
      </div>
    </DashboardLayout>
  );
}
