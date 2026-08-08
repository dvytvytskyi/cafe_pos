'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Square, DollarSign, TrendingUp, Plus, Minus, History, AlertTriangle, CheckCircle2, Calendar, ArrowDownRight, ArrowUpRight, Lock, Unlock, ChevronDown } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import {
  Shift,
  getShiftsAsync,
  openShiftAsync,
  closeShiftAsync,
  recordCashAdjustmentAsync,
  getCurrentShiftAsync,
} from '@/lib/shifts';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';
import { getCurrentUserId } from '@/lib/current-user';

export default function ShiftPage() {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [activeShift, setActiveShift] = useState<Shift | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [floatInput, setFloatInput] = useState('100.00');
  const [adjType, setAdjType] = useState<'in' | 'out'>('out');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [actualCashInput, setActualCashInput] = useState('');
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');

  const refreshShifts = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [all, active] = await Promise.all([
        getShiftsAsync(DEFAULT_LOCATION_ID),
        getCurrentShiftAsync(DEFAULT_LOCATION_ID),
      ]);
      setShifts(all);
      setActiveShift(active);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Failed to load shifts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshShifts().catch(console.error);
  }, [refreshShifts]);

  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    setBusy(true);
    try {
      const float = parseFloat(floatInput.replace(/,/g, '')) || 0;
      const opened = await openShiftAsync(DEFAULT_LOCATION_ID, getCurrentUserId(), float);
      setActiveShift(opened);
      await refreshShifts();
      setFloatInput('100.00');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to open shift');
    } finally {
      setBusy(false);
    }
  };

  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    setActionError(null);
    setBusy(true);
    try {
      const actual = parseFloat(actualCashInput.replace(/,/g, '')) || 0;
      await closeShiftAsync(activeShift.id, actual);
      setActualCashInput('');
      await refreshShifts();
      setActiveTab('history');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to close shift');
    } finally {
      setBusy(false);
    }
  };

  const handleAddAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) return;
    const amount = parseFloat(adjAmount.replace(/,/g, '')) || 0;
    if (amount <= 0 || !adjReason.trim()) return;

    setActionError(null);
    setBusy(true);
    try {
      const updated = await recordCashAdjustmentAsync(activeShift.id, adjType, amount, adjReason);
      setActiveShift(updated);
      setAdjAmount('');
      setAdjReason('');
      await refreshShifts();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed to record adjustment');
    } finally {
      setBusy(false);
    }
  };

  const formatCurrencyInput = (val: string) => {
    const digits = val.replace(/\D/g, '');
    if (!digits) return '';

    const num = parseInt(digits, 10);
    if (isNaN(num)) return '';

    const decimalValue = (num / 100).toFixed(2);
    const parts = decimalValue.split('.');
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    return parts.join('.');
  };

  const liveExpectedCash = activeShift?.expectedCash ?? 0;
  const typedActualCash = parseFloat(actualCashInput.replace(/,/g, '')) || 0;
  const liveDiscrepancy = actualCashInput ? parseFloat((typedActualCash - liveExpectedCash).toFixed(2)) : 0;

  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>, setter: (val: string) => void) => {
    const el = e.target;
    setter(formatCurrencyInput(el.value));

    setTimeout(() => {
      if (el) {
        el.selectionStart = el.selectionEnd = el.value.length;
      }
    }, 0);
  };

  if (loading && shifts.length === 0 && !activeShift) {
    return (
      <DashboardLayout>
        <div className="bg-white rounded-3xl p-8 flex-1 flex items-center justify-center text-gray-500 font-medium">
          Loading shifts…
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm flex-1 flex flex-col h-full overflow-hidden">

        {(loadError || actionError) && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-semibold">
            {actionError || loadError}
          </div>
        )}

        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-6 shrink-0">
          <div className="flex-1 min-w-0 pr-4 sm:pr-6">
            <h1 className="text-2xl font-black text-gray-900 tracking-tight leading-tight">Cash Register & Shifts</h1>
            <p className="text-sm font-medium text-gray-500 mt-1.5 leading-relaxed">Manage shift opening, cash drawer audits, and Z-Reports.</p>
          </div>
          
          <div className="flex w-full sm:w-auto bg-gray-100/80 p-1.5 rounded-xl shrink-0 relative mt-1 sm:mt-0">
            <button
              onClick={() => setActiveTab('current')}
              className={`relative flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'current' ? 'text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {activeTab === 'current' && (
                <motion.div
                  layoutId="shift-tab-active"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                />
              )}
              <span className="relative z-10">Current Shift</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`relative flex-1 sm:flex-none px-5 py-2 rounded-lg text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'history' ? 'text-gray-900 shadow-sm' : 'text-gray-400 hover:text-gray-700'
              }`}
            >
              {activeTab === 'history' && (
                <motion.div
                  layoutId="shift-tab-active"
                  className="absolute inset-0 bg-white rounded-lg shadow-sm"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.45 }}
                />
              )}
              <span className="relative z-10">Shift History</span>
            </button>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Tab 1: Current Shift */}
          {activeTab === 'current' && (
            <motion.div 
              key="current"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="flex-1 overflow-y-auto pr-1 min-h-0 space-y-4"
            >
              <AnimatePresence mode="wait">
                {!activeShift ? (
                  /* No Active Shift: Open Shift Form */
                  <motion.div 
                    key="closed"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                    className="max-w-md mx-auto my-12 bg-white rounded-[2rem] p-10 border border-gray-200/60 flex flex-col items-center text-center"
                  >
                <div className="w-16 h-16 rounded-full bg-beige flex items-center justify-center text-brown mb-6 border border-darker-beige/40">
                  <Lock size={28} />
                </div>
                <h2 className="text-2xl font-black text-gray-900 tracking-tight mb-2">Shift is Closed</h2>
                <p className="text-sm text-gray-500 font-medium mb-8 leading-relaxed">Open a new shift to unlock table ordering, delivery checkouts, and print tickets.</p>
                
                <form onSubmit={handleOpenShift} className="w-full space-y-5 text-left">
                  <div>
                    <label className="label-corgi text-sm mb-2 block">Starting Cash Float</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 text-lg">€</span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={floatInput}
                        onChange={e => handleCurrencyChange(e, setFloatInput)}
                        className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-10 pr-4 py-3.5 text-lg font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/20 transition-all"
                        placeholder="100.00"
                        required
                      />
                    </div>
                  </div>
                  
                  <button
                    type="submit"
                    className="w-full py-4 bg-black hover:bg-gray-800 text-white rounded-2xl font-bold text-base transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.98]"
                  >
                    <Play size={18} fill="white" /> Open Register Shift
                  </button>
                </form>
              </motion.div>
            ) : (
              /* Active Shift Panel */
              <motion.div 
                key="open"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start"
              >
                
                {/* Left Col: Metrics & Close Shift */}
                <div className="xl:col-span-2 space-y-4">
                  
                  {/* Status Banner */}
                  <div className="bg-white rounded-3xl p-5 border border-gray-200/60 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-3 w-3 relative">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </span>
                      <div>
                        <div className="font-bold text-gray-900">Shift {activeShift.id} is Open</div>
                        <div className="text-xs text-gray-400 font-semibold mt-0.5">
                          Opened at {activeShift.openedAt.toLocaleDateString()} {activeShift.openedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} <span className="text-gray-300 mx-1">•</span> by Name Surname
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/50 text-xs font-bold uppercase">
                        Active Register
                      </span>
                    </div>
                  </div>

                  {/* Shift Summary Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="bg-gray-50/50 border border-gray-200/60 rounded-[1.5rem] p-5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Expected Cash</span>
                      <span className="text-2xl font-black text-gray-900">€{liveExpectedCash.toFixed(2)}</span>
                    </div>
                    <div className="bg-white border border-gray-200/60 rounded-[1.5rem] p-5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Cash Float</span>
                      <span className="text-2xl font-black text-gray-900">€{activeShift.floatAmount.toFixed(2)}</span>
                    </div>
                    <div className="bg-white border border-gray-200/60 rounded-[1.5rem] p-5 sm:col-span-2 lg:col-span-1">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block mb-1.5">Cash / Card Sales</span>
                      <span className="text-2xl font-black text-gray-900">
                        €{activeShift.cashSales.toFixed(2)} <span className="text-gray-300 font-medium">/</span> €{activeShift.cardSales.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Cash In / Out Form & Logs */}
                  <div className="bg-white rounded-3xl border border-gray-200/60 overflow-hidden">
                    <div className="p-5 sm:p-6 border-b border-gray-100 flex items-center gap-3">
                      <TrendingUp size={20} className="text-gray-400" />
                      <h3 className="font-bold text-gray-900 text-sm">Cash Drawer Adjustments</h3>
                    </div>
                    
                    <form onSubmit={handleAddAdjustment} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-5 sm:p-6 pb-2 border-b border-gray-100">
                      <div className="relative">
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Action</label>
                        <select
                          value={adjType}
                          onChange={e => setAdjType(e.target.value as 'in' | 'out')}
                          className="w-full appearance-none bg-gray-50/50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/20 transition-all cursor-pointer"
                        >
                          <option value="out">Cash Out</option>
                          <option value="in">Cash In</option>
                        </select>
                        <div className="absolute right-4 bottom-3.5 pointer-events-none text-gray-400">
                          <ChevronDown size={18} />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Amount (€)</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={adjAmount}
                          onChange={e => handleCurrencyChange(e, setAdjAmount)}
                          className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/20 transition-all"
                          placeholder="0.00"
                          required
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">Reason / Description</label>
                        <div className="flex gap-2 w-full">
                          <input
                            type="text"
                            value={adjReason}
                            onChange={e => setAdjReason(e.target.value)}
                            className="flex-1 bg-gray-50/50 border border-gray-200 rounded-2xl px-4 py-3.5 text-sm font-bold text-gray-900 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/20 transition-all"
                            placeholder="e.g. Courier payment..."
                            required
                          />
                          <button
                            type="submit"
                            className="px-6 py-3.5 bg-black hover:bg-gray-800 text-white rounded-2xl text-sm font-bold transition-all shrink-0 cursor-pointer active:scale-[0.98]"
                          >
                            Apply
                          </button>
                        </div>
                      </div>
                    </form>

                    {/* Adjustments List */}
                    <div className="space-y-3 p-5 sm:p-6">
                      <div className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-4">Adjustments History</div>
                      {activeShift.adjustments.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 text-sm font-semibold bg-gray-50/30 rounded-2xl border border-dashed border-gray-200">No adjustments yet</div>
                      ) : (
                        <div className="space-y-3">
                          {activeShift.adjustments.map((adj, i) => (
                            <div key={i} className="p-3 bg-white border border-gray-100 rounded-2xl flex justify-between items-center transition-all hover:border-gray-200 hover:bg-gray-50/30">
                              <div className="flex items-center gap-3.5">
                                <div className={`p-2.5 rounded-xl shrink-0 ${adj.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                  {adj.type === 'in' ? <ArrowUpRight size={18} strokeWidth={2.5} /> : <ArrowDownRight size={18} strokeWidth={2.5} />}
                                </div>
                                <div>
                                  <span className="font-bold text-sm text-gray-900 block">{adj.reason}</span>
                                  <span className="text-[11px] font-medium text-gray-400 mt-0.5 block">{adj.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </div>
                              </div>
                              <span className={`font-black text-base ${adj.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                                {adj.type === 'in' ? '+' : '-'}€{adj.amount.toFixed(2)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Col: Close Shift & Z-Report Form */}
                <div className="xl:col-span-1 bg-white rounded-[2rem] p-8 border border-gray-200/60 flex flex-col gap-6">
                  <div>
                    <h3 className="text-base font-bold text-gray-900 mb-1">
                      Close Shift (Z-Report)
                    </h3>
                    <p className="text-xs text-gray-400 font-semibold">Count actual cash in drawer to close register shift and log audits.</p>
                  </div>

                  <form onSubmit={handleCloseShift} className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-2 block">Actual Cash in Drawer</label>
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 font-black text-xl">€</div>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={actualCashInput}
                          onChange={e => handleCurrencyChange(e, setActualCashInput)}
                          className="w-full bg-gray-50/50 border border-gray-200 rounded-2xl pl-10 pr-4 py-4 text-xl font-black text-gray-900 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/20 transition-all"
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>

                    {actualCashInput && (
                      <div className={`p-4 rounded-xl border flex items-center gap-3 ${
                        liveDiscrepancy === 0 
                          ? 'bg-emerald-50 border-emerald-200/50 text-emerald-600' 
                          : liveDiscrepancy > 0 
                          ? 'bg-beige text-brown border-darker-beige/50' 
                          : 'bg-red-50 border-red-100 text-red-700'
                      }`}>
                        {liveDiscrepancy === 0 ? (
                          <>
                            <CheckCircle2 size={18} />
                            <div className="text-xs font-bold">Perfect match! Expected €{liveExpectedCash.toFixed(2)}.</div>
                          </>
                        ) : (
                          <>
                            <AlertTriangle size={18} />
                            <div className="text-xs font-bold leading-normal">
                              {liveDiscrepancy > 0 
                                ? `Overage: +€${liveDiscrepancy.toFixed(2)} (Expected €${liveExpectedCash.toFixed(2)})`
                                : `Shortage: -€${Math.abs(liveDiscrepancy).toFixed(2)} (Expected €${liveExpectedCash.toFixed(2)})`
                              }
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    <button
                      type="submit"
                      className="w-full py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold text-lg transition-all cursor-pointer flex items-center justify-center active:scale-[0.98]"
                    >
                      Close Shift & Generate Z-Report
                    </button>
                  </form>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
          </motion.div>
        )}

        {/* Tab 2: Shift History */}
        {activeTab === 'history' && (
          <motion.div 
            key="history"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="flex-1 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/20 flex flex-col min-h-0"
          >
            <div className="flex-1 overflow-y-auto">
              {shifts.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                  <History size={40} className="mb-3 opacity-20 text-brown" />
                  <p className="font-bold text-xs text-gray-500">No shifts logged yet</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 bg-white text-[10px] font-black uppercase text-gray-400 tracking-wider sticky top-0 z-10">
                      <th className="px-6 py-4">Shift ID</th>
                      <th className="px-6 py-4">Status</th>
                      <th className="px-6 py-4">Opened</th>
                      <th className="px-6 py-4">Closed</th>
                      <th className="px-6 py-4">Starting Float</th>
                      <th className="px-6 py-4">Cash Sales</th>
                      <th className="px-6 py-4">Card Sales</th>
                      <th className="px-6 py-4">Expected Cash</th>
                      <th className="px-6 py-4">Actual Cash</th>
                      <th className="px-6 py-4">Difference</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 bg-white text-xs font-semibold text-gray-700">
                    {shifts.slice().reverse().map(s => (
                      <React.Fragment key={s.id}>
                        <tr 
                          className="hover:bg-beige/10 transition-colors cursor-pointer group"
                          onClick={() => setExpandedHistoryId(expandedHistoryId === s.id ? null : s.id)}
                        >
                          <td className="px-6 py-4 font-black text-gray-900 flex items-center gap-2">
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${expandedHistoryId === s.id ? 'rotate-180' : 'group-hover:text-gray-900'}`} />
                            {s.id}
                          </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            s.status === 'open' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-200/50' 
                              : 'bg-gray-100 text-gray-500 border-gray-200'
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {s.openedAt.toLocaleDateString()} {s.openedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-gray-500">
                          {s.closedAt ? (
                            `${s.closedAt.toLocaleDateString()} ${s.closedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                          ) : (
                            <span className="text-gray-400 italic">Ongoing</span>
                          )}
                        </td>
                        <td className="px-6 py-4">€{s.floatAmount.toFixed(2)}</td>
                        <td className="px-6 py-4">€{s.cashSales.toFixed(2)}</td>
                        <td className="px-6 py-4">€{s.cardSales.toFixed(2)}</td>
                        <td className="px-6 py-4">€{s.expectedCash.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          {s.actualCash !== undefined ? `€${s.actualCash.toFixed(2)}` : <span className="text-gray-400 italic">N/A</span>}
                        </td>
                        <td className="px-6 py-4">
                          {s.shortageOverage !== undefined ? (
                            <span className={`font-black ${
                              s.shortageOverage === 0 
                                ? 'text-gray-600' 
                                : s.shortageOverage > 0 
                                ? 'text-blue-600' 
                                : 'text-red-500'
                            }`}>
                              {s.shortageOverage > 0 ? '+' : ''}€{s.shortageOverage.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">N/A</span>
                          )}
                        </td>
                      </tr>
                      {/* Expandable Adjustments Row */}
                      <AnimatePresence>
                        {expandedHistoryId === s.id && (
                          <tr>
                            <td colSpan={10} className="p-0 border-b border-gray-100 bg-gray-50/30">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="py-4 px-12">
                                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-3">Adjustments History</h4>
                                  {s.adjustments.length === 0 ? (
                                    <div className="text-gray-400 text-xs italic bg-white p-3 rounded-xl border border-dashed border-gray-200 inline-block">No drawer adjustments recorded in this shift</div>
                                  ) : (
                                    <div className="space-y-2 w-full max-w-lg">
                                      {s.adjustments.map((adj, i) => (
                                        <div key={i} className="py-2.5 px-4 bg-white border border-gray-100 rounded-xl flex justify-between items-center transition-all">
                                          <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg shrink-0 ${adj.type === 'in' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                                              {adj.type === 'in' ? <ArrowUpRight size={16} strokeWidth={2.5} /> : <ArrowDownRight size={16} strokeWidth={2.5} />}
                                            </div>
                                            <div>
                                              <span className="font-bold text-xs text-gray-900 block">{adj.reason}</span>
                                              <span className="text-[10px] font-medium text-gray-400 mt-0.5 block">{adj.time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                          </div>
                                          <span className={`font-black text-sm ${adj.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                                            {adj.type === 'in' ? '+' : '-'}€{adj.amount.toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            </td>
                          </tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </motion.div>
        )}
        </AnimatePresence>

      </div>
    </DashboardLayout>
  );
}
