'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Calendar, Filter, Eye, AlertCircle, ShoppingBag, Bike, Store, Tablet, ChevronDown, X, BarChart3, TrendingUp, Coins, DollarSign, Percent, ReceiptText, CheckCircle2, Split, Printer } from 'lucide-react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import ClientDateTime from '@/components/ui/ClientDateTime';
import { Order, getOrderHistoryAsync, updateOrderAsync } from '@/lib/orders';
import OrderDetailsModal from '@/components/operations/OrderDetailsModal';

const HISTORY_REFRESH_INTERVAL_MS = 30_000;

function HistoryPageContent() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'cancelled' | 'active'>('all');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'dine_in' | 'takeaway' | 'glovo' | 'ubereats'>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [receiptOrder, setReceiptOrder] = useState<Order | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadHistory = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setLoading(true);
    }
    setLoadError(null);
    try {
      const end = new Date();
      const start = new Date();
      start.setDate(start.getDate() - 90);
      const data = await getOrderHistoryAsync({
        source: sourceFilter === 'all' ? undefined : sourceFilter,
        query: debouncedSearch.trim() || undefined,
        startDate: start.toISOString().slice(0, 10),
        endDate: end.toISOString().slice(0, 10),
        limit: 100,
      });
      setOrders(data.orders);
    } catch (e) {
      console.error('Failed to load order history:', e);
      if (!options?.silent) {
        setLoadError(e instanceof Error ? e.message : 'Failed to load history');
      }
    } finally {
      if (!options?.silent) {
        setLoading(false);
      }
    }
  }, [sourceFilter, debouncedSearch]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void loadHistory({ silent: true });
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadHistory]);

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadHistory({ silent: true });
      }
    }, HISTORY_REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [loadHistory]);

  // Stats Calculations based on filtered list (or all list)
  const completedOrders = orders.filter(o => o.paid || o.status === 'completed');
  const cancelledOrders = orders.filter(o => o.status === 'cancelled');

  const totalVolume = completedOrders.reduce((sum, o) => sum + o.total, 0);
  const avgOrderValue = completedOrders.length > 0 ? totalVolume / completedOrders.length : 0;
  const totalTax = totalVolume * 0.10; // 10% VAT
  const cancelRate = orders.length > 0 ? (cancelledOrders.length / orders.length) * 100 : 0;

  // Channel breakdown volume
  const channelBreakdown = completedOrders.reduce((acc, o) => {
    acc[o.source] = (acc[o.source] || 0) + o.total;
    return acc;
  }, { dine_in: 0, takeaway: 0, glovo: 0, ubereats: 0 } as Record<string, number>);

  // Payment methods breakdown volume
  const paymentBreakdown = completedOrders.reduce((acc, o) => {
    if (o.payments) {
      o.payments.forEach(p => {
        acc[p.method] = (acc[p.method] || 0) + p.amount;
      });
    }
    return acc;
  }, { cash: 0, card: 0, points: 0 } as Record<string, number>);

  // Filter orders
  const filteredOrders = orders.filter(order => {
    // Search handled server-side; keep client match for instant feedback on status-only rows
    const matchSearch =
      !searchQuery.trim() ||
      order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (order.orderNumber ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Status filter
    let matchStatus = true;
    if (statusFilter === 'completed') matchStatus = order.paid || order.status === 'completed';
    else if (statusFilter === 'cancelled') matchStatus = order.status === 'cancelled';
    else if (statusFilter === 'active') matchStatus = !order.paid && order.status !== 'cancelled' && order.status !== 'completed';

    // Source filter handled server-side via sourceFilter reload
    const matchSource = true;

    return matchSearch && matchStatus && matchSource;
  }).sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()); // newest first

  const getSourceIcon = (source: Order['source']) => {
    switch (source) {
      case 'dine_in': return <Tablet size={16} className="text-emerald-500" />;
      case 'takeaway': return <Store size={16} className="text-blue-500" />;
      case 'glovo': return <Bike size={16} className="text-amber-500" />;
      case 'ubereats': return <ShoppingBag size={16} className="text-green-500" />;
    }
  };

  const getStatusBadge = (order: Order) => {
    const refunded = order.refundedAmount ?? 0;
    if (refunded >= order.total - 0.01) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-orange-50 text-orange-700 border border-orange-200 flex items-center gap-1 w-fit">
          Refunded
        </span>
      );
    }
    if (refunded > 0) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1 w-fit">
          Partial Refund
        </span>
      );
    }
    if (order.status === 'cancelled') {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-600 border border-red-100 flex items-center gap-1 w-fit">
          Cancelled
        </span>
      );
    }
    if (order.paid) {
      return (
        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 border border-emerald-200/50 flex items-center gap-1 w-fit">
          Paid
        </span>
      );
    }
    return (
      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500 border border-gray-200 flex items-center gap-1 w-fit">
        Pending
      </span>
    );
  };

  const handleUpdateOrder = (updatedOrder: Order) => {
    const updated = orders.map(o => o.id === updatedOrder.id ? updatedOrder : o);
    setOrders(updated);
    setSelectedOrder(updatedOrder);
  };

  const handlePaymentComplete = (updated: Order) => {
    const updatedList = orders.map(o => o.id === updated.id ? updated : o);
    setOrders(updatedList);
    setSelectedOrder(updated.paid ? null : updated);
  };

  return (
    <DashboardLayout>
      <div
        data-testid="history-page"
        className="bg-white rounded-3xl p-6 md:p-8 flex-1 flex flex-col h-full overflow-hidden"
      >
        
        {/* CRM-Style Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 mb-6 shrink-0">
          <div className="flex-1 min-w-0 pr-4 sm:pr-6">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight leading-tight">Order History & Archive</h1>
            <p className="text-sm font-medium text-gray-500 mt-1.5 leading-relaxed">Review, inspect, print and manage past cafe transactions.</p>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0 mt-1 sm:mt-0">
            <button 
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`w-full sm:w-auto justify-center px-4 py-2 rounded-xl text-xs font-bold transition-all border cursor-pointer flex items-center gap-1.5 ${
                showAnalytics 
                  ? 'bg-gray-950 text-white border-gray-950' 
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <BarChart3 size={15} />
              <span>{showAnalytics ? 'Hide Analytics' : 'Show Analytics'}</span>
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-700 text-sm font-medium flex items-center gap-2">
            <AlertCircle size={16} />
            {loadError}
          </div>
        )}

        {/* Analytics Section */}
        {isClient && showAnalytics && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 shrink-0 animate-in fade-in duration-300">
            {/* Sales Volume */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl text-gray-700">
                <TrendingUp size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Total Sales</span>
                <span className="text-lg font-bold text-gray-900">€{totalVolume.toFixed(2)}</span>
              </div>
            </div>

            {/* Avg Ticket */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl text-gray-700">
                <DollarSign size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Avg Ticket</span>
                <span className="text-lg font-bold text-gray-900">€{avgOrderValue.toFixed(2)}</span>
              </div>
            </div>

            {/* Taxes */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl text-gray-700">
                <Coins size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Taxes (10%)</span>
                <span className="text-lg font-bold text-gray-900">€{totalTax.toFixed(2)}</span>
              </div>
            </div>

            {/* Void Rate */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 flex items-center gap-3">
              <div className="p-3 bg-gray-100 rounded-xl text-gray-700">
                <Percent size={20} />
              </div>
              <div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Void/Cancel Rate</span>
                <span className="text-lg font-bold text-gray-900">{cancelRate.toFixed(1)}%</span>
              </div>
            </div>
          </div>
        )}

        {isClient && showAnalytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 shrink-0 animate-in fade-in duration-300">
            {/* Channels Breakdown */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Sales Channels</span>
              <div className="space-y-2">
                {[
                  { name: 'Dine-In', amount: channelBreakdown.dine_in, color: 'bg-corgi' },
                  { name: 'Takeaway', amount: channelBreakdown.takeaway, color: 'bg-corgi' },
                  { name: 'Glovo', amount: channelBreakdown.glovo, color: 'bg-corgi' },
                  { name: 'Uber Eats', amount: channelBreakdown.ubereats, color: 'bg-corgi' },
                ].map(c => {
                  const pct = totalVolume > 0 ? (c.amount / totalVolume) * 100 : 0;
                  return (
                    <div key={c.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-600">{c.name}</span>
                        <span className="text-gray-900">€{c.amount.toFixed(2)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200/50 rounded-full overflow-hidden">
                        <div className={`h-full ${c.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payments Breakdown */}
            <div className="bg-gray-50 border border-gray-100 rounded-2xl p-4 space-y-3">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Payment Methods</span>
              <div className="space-y-2">
                {[
                  { name: 'Cash', amount: paymentBreakdown.cash, color: 'bg-corgi' },
                  { name: 'Card', amount: paymentBreakdown.card, color: 'bg-corgi' },
                  { name: 'Points', amount: paymentBreakdown.points, color: 'bg-corgi' },
                ].map(p => {
                  const totalPaid = paymentBreakdown.cash + paymentBreakdown.card + paymentBreakdown.points;
                  const pct = totalPaid > 0 ? (p.amount / totalPaid) * 100 : 0;
                  return (
                    <div key={p.name} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-600">{p.name}</span>
                        <span className="text-gray-900">€{p.amount.toFixed(2)} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="w-full h-2 bg-gray-200/50 rounded-full overflow-hidden">
                        <div className={`h-full ${p.color}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Filter controls row */}
        <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center mb-6 shrink-0">
          {/* Corgi style Search Input */}
          <div className="relative w-full lg:w-80">
            <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              data-testid="history-search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by receipt #, ID or customer..."
              className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-xs font-bold text-gray-800 outline-none hover:border-gray-300 focus:border-corgi focus:ring-4 focus:ring-corgi/20 transition-all placeholder:text-gray-400"
            />
          </div>

          <div className="flex flex-wrap gap-3 w-full xl:w-auto">
            {/* Status Filter Tabs */}
            <div className="flex flex-auto bg-gray-100/80 p-1.5 rounded-xl">
              {(['all', 'completed', 'cancelled', 'active'] as const).map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`flex-1 text-center whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    statusFilter === status 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Channel Filter Tabs */}
            <div className="flex flex-auto bg-gray-100/80 p-1.5 rounded-xl">
              {(['all', 'dine_in', 'takeaway', 'glovo', 'ubereats'] as const).map(source => (
                <button
                  key={source}
                  data-testid={`history-source-${source}`}
                  onClick={() => setSourceFilter(source)}
                  className={`flex-1 text-center whitespace-nowrap px-3 py-1.5 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer ${
                    sourceFilter === source 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-400 hover:text-gray-700'
                  }`}
                >
                  {source === 'all' ? 'All Channels' : source.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Order Archive Table Container */}
        {isClient ? (
        <div className="flex-1 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/20 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto">
            {filteredOrders.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-gray-400 p-8">
                <AlertCircle size={40} className="mb-3 opacity-20 text-brown" />
                <p className="font-bold text-xs text-gray-500">No orders found matching filters</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 bg-white text-[10px] font-bold uppercase text-gray-400 tracking-wider sticky top-0 z-10">
                    <th className="px-6 py-4">Order ID</th>
                    <th className="px-6 py-4">Time</th>
                    <th className="px-6 py-4">Customer</th>
                    <th className="px-6 py-4">Channel</th>
                    <th className="px-6 py-4">Payment Method</th>
                    <th className="px-6 py-4">Total</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {filteredOrders.map(order => (
                    <React.Fragment key={order.id}>
                      <tr
                        data-testid={`history-row-${order.orderNumber ?? order.id}`}
                        className="hover:bg-gray-50 transition-colors cursor-pointer group"
                        onClick={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
                      >
                        <td className="px-6 py-4 text-xs font-bold text-gray-900">
                          <div className="flex items-center gap-2">
                            <ChevronDown 
                              size={16} 
                              className={`text-gray-400 transition-transform duration-200 ${expandedOrderId === order.id ? 'rotate-180' : '-rotate-90'}`}
                            />
                            {order.orderNumber ?? order.id}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-gray-500 font-semibold">
                          <ClientDateTime date={order.time} />
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-900">
                          {order.customerName}
                          {order.waiterName && (
                            <span className="block text-[10px] text-gray-400 font-semibold mt-0.5">
                              Waiter: {order.waiterName}
                            </span>
                          )}
                          {order.tableNumber && (
                            <span className="block text-[10px] text-gray-400 font-semibold">
                              Table {order.tableNumber}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-700">
                          <div className="flex items-center gap-2 capitalize">
                            {order.source.replace('_', ' ')}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-700">
                          {order.payments && order.payments.length > 0 ? (
                            <div className="flex gap-1.5 flex-wrap">
                              {order.payments.map((p, i) => (
                                <span key={i} className="px-2 py-0.5 rounded-md bg-beige text-brown font-bold uppercase text-[9px] border border-darker-beige/40">
                                  {p.method}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 font-semibold">None</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-gray-900">€{order.total.toFixed(2)}</td>
                        <td className="px-6 py-4">{getStatusBadge(order)}</td>
                        <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="px-4 py-2 hover:bg-gray-100 text-gray-500 hover:text-gray-900 rounded-xl transition-all cursor-pointer inline-flex items-center gap-1.5 text-xs font-bold"
                          >
                            View
                          </button>
                        </td>
                      </tr>
                      {/* Expandable Order Items Row */}
                      <AnimatePresence>
                        {expandedOrderId === order.id && (
                          <tr>
                            <td colSpan={8} className="p-0 border-b border-gray-100 bg-gray-50/30">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="py-4 px-12 flex flex-col lg:flex-row gap-8">
                                  {/* Left: Order Items */}
                                  <div className="flex-1">
                                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">Order Items</h4>
                                    {order.items.length === 0 ? (
                                      <div className="text-gray-400 text-xs italic bg-white p-3 rounded-xl border border-dashed border-gray-200 inline-block">No items in this order</div>
                                    ) : (
                                      <div className="space-y-2 w-full max-w-lg">
                                        {order.items.map((item, i) => (
                                          <div key={i} className="py-2.5 px-4 bg-white border border-gray-100 rounded-xl flex justify-between items-center transition-all">
                                            <div className="flex items-center gap-3">
                                              <div className="w-6 h-6 rounded bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600 shrink-0">
                                                {item.quantity}x
                                              </div>
                                              <div>
                                                <span className="font-bold text-xs text-gray-900 block">{item.name}</span>
                                                {item.comments && (
                                                  <span className="text-[10px] font-medium text-gray-400 mt-0.5 block">{item.comments}</span>
                                                )}
                                              </div>
                                            </div>
                                            <span className="font-bold text-sm text-gray-900">
                                              €{(item.price * item.quantity).toFixed(2)}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                  
                                  {/* Right: Payment Info */}
                                  <div className="w-full lg:w-1/3 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-4">
                                    <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                                      <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Payment Info</h4>
                                      {order.paid ? (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                                          <CheckCircle2 size={12} /> Paid
                                        </span>
                                      ) : (
                                        <span className="flex items-center gap-1 text-[10px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                                          Pending
                                        </span>
                                      )}
                                    </div>
                                    
                                    <div className="space-y-3">
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-gray-500">Amount Paid</span>
                                        <span className="font-bold text-gray-900">€{(order.amountPaid || order.total).toFixed(2)}</span>
                                      </div>
                                      
                                      <div className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-gray-500">Tip</span>
                                        <span className="font-bold text-gray-900">
                                          {order.tip?.amountAdded ? `€${order.tip.amountAdded.toFixed(2)}` : '€0.00'}
                                        </span>
                                      </div>
                                      
                                      {order.payments && order.payments.length > 0 && (
                                        <div className="flex justify-between items-start text-xs border-t border-gray-50 pt-3">
                                          <span className="font-semibold text-gray-500 flex items-center">
                                            Method 
                                            {order.payments.length > 1 && (
                                              <span className="inline-flex items-center gap-1 ml-2 text-[9px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded uppercase font-bold"><Split size={10} /> Split</span>
                                            )}
                                          </span>
                                          <div className="text-right space-y-1">
                                            {order.payments.map((p, i) => (
                                              <div key={i} className="font-bold text-gray-900 uppercase text-[10px]">
                                                {p.method} <span className="text-gray-400 font-medium ml-1">€{p.amount.toFixed(2)}</span>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      )}
                                      
                                      <div className="flex justify-between items-center text-xs border-t border-gray-50 pt-3">
                                        <span className="font-semibold text-gray-500">Receipt Sent</span>
                                        <span className="font-bold text-gray-900">
                                          {order.receiptsSentTo && order.receiptsSentTo.length > 0 ? (
                                            <span className="text-emerald-600">Yes</span>
                                          ) : (
                                            <span className="text-gray-400">No</span>
                                          )}
                                        </span>
                                      </div>
                                    </div>
                                    
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setReceiptOrder(order); }}
                                      className="w-full mt-4 bg-gray-50 hover:bg-gray-100 text-gray-700 py-2.5 rounded-xl text-xs font-bold transition-colors flex justify-center items-center gap-2 border border-gray-200 cursor-pointer"
                                    >
                                      <ReceiptText size={16} />
                                      Generate Receipt
                                    </button>
                                  </div>
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
        </div>
        ) : (
          <div className="flex-1 border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/20 flex items-center justify-center text-gray-400 text-sm font-medium">
            Loading order archive…
          </div>
        )}
      </div>

      {/* Details slide over / modal */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onUpdateStatus={(id, status) => {
            const updated = orders.map(o => o.id === id ? { ...o, status: status as Order['status'] } : o);
            setOrders(updated);
            if (selectedOrder.id === id) {
              setSelectedOrder({ ...selectedOrder, status: status as Order['status'] });
            }
          }}
          onUpdateOrder={async (updatedOrder) => {
            try {
              const updated = await updateOrderAsync(updatedOrder.id, updatedOrder);
              handleUpdateOrder(updated);
            } catch (err) {
              console.error('Failed to update order:', err);
            }
          }}
          onPaymentComplete={handlePaymentComplete}
        />
      )}

      {/* Receipt Preview Modal */}
      <AnimatePresence>
        {receiptOrder && (
          <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <ReceiptText size={18} className="text-gray-400" /> 
                  Receipt Preview
                </h3>
                <button 
                  onClick={() => setReceiptOrder(null)}
                  className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>
              
              {/* Thermal Receipt Content */}
              <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
                <div className="bg-white p-6 shadow-sm border border-gray-200 font-mono text-xs text-gray-800 mx-auto max-w-[280px]">
                  <div className="text-center mb-6">
                    <h2 className="text-xl font-bold mb-1">CORGI CAFE</h2>
                    <p className="text-gray-500">123 Baker Street, London</p>
                    <p className="text-gray-500">VAT: GB123456789</p>
                  </div>
                  
                  <div className="flex justify-between border-b border-dashed border-gray-300 pb-2 mb-2">
                    <span>Date: <ClientDateTime date={receiptOrder.time} /></span>
                  </div>
                  <div className="flex justify-between border-b border-dashed border-gray-300 pb-2 mb-4">
                    <span>Order: {receiptOrder.id}</span>
                    <span className="truncate max-w-[100px] text-right">{receiptOrder.customerName}</span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    {receiptOrder.items.map((item, i) => (
                      <div key={i} className="flex justify-between">
                        <span>{item.quantity}x {item.name}</span>
                        <span>€{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="border-t border-dashed border-gray-300 pt-2 space-y-1 mb-4">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span>€{(receiptOrder.total / 1.1).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (10%)</span>
                      <span>€{(receiptOrder.total - (receiptOrder.total / 1.1)).toFixed(2)}</span>
                    </div>
                    {receiptOrder.tip?.amountAdded ? (
                      <div className="flex justify-between">
                        <span>Tip</span>
                        <span>€{receiptOrder.tip.amountAdded.toFixed(2)}</span>
                      </div>
                    ) : null}
                    <div className="flex justify-between font-bold text-sm pt-2 border-t border-gray-800 mt-2">
                      <span>TOTAL</span>
                      <span>€{(receiptOrder.total + (receiptOrder.tip?.amountAdded || 0)).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="text-center mt-6 pt-4 border-t border-dashed border-gray-300">
                    <p>Paid via {receiptOrder.payments?.[0]?.method.toUpperCase() || 'CASH'}</p>
                    <p className="mt-4 font-bold text-sm">Thank you for visiting!</p>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="p-4 border-t border-gray-100 flex gap-3 bg-white">
                <button 
                  onClick={() => setReceiptOrder(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Close
                </button>
                <button 
                  onClick={() => {
                    setReceiptOrder(null);
                  }}
                  className="flex-1 py-3 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors flex justify-center items-center gap-2 cursor-pointer shadow-md"
                >
                  <Printer size={18} />
                  Print Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}

export default function HistoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500 font-bold">Loading History...</div>}>
      <HistoryPageContent />
    </Suspense>
  );
}
