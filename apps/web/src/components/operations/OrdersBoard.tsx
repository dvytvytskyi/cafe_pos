import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Clock, Check, AlertCircle, MapPin, Store, Settings, X, ChevronDown, Minimize2, Maximize2, CheckSquare, CreditCard, Plus } from 'lucide-react';
import BoardSettingsModal, { Stage } from './BoardSettingsModal';
import OrderDetailsModal from './OrderDetailsModal';
import OrderTerminalModal from '@/components/pos/OrderTerminalModal';

import { Order, OrderSource, getOrdersAsync, updateOrderAsync, updateOrderStatusAsync, createOrderAsync } from '@/lib/orders';
import { getGuestsAsync } from '@/lib/crm';
import { DEFAULT_LOCATION_ID } from '@/lib/constants';
import { filterOrdersForColumn, sortOrdersOldestFirst, groupItemsKitchenVsBar } from '@/lib/orders-board';
import { subscribeToPosEvents } from '@/lib/pos-events-client';
import {
  getBoardSettingsAsync,
  saveBoardSettingsAsync,
  DEFAULT_ORDER_STAGES,
} from '@/lib/board-settings';

const COLUMNS = DEFAULT_ORDER_STAGES;

interface OrdersBoardProps {
  extraHeaderActions?: React.ReactNode;
}

export default function OrdersBoard({ extraHeaderActions }: OrdersBoardProps = {}) {
  const [columns, setColumns] = useState<Stage[]>(COLUMNS);
  const [orders, setOrders] = useState<Order[]>([]);

  const fetchOrders = useCallback(async () => {
    try {
      const data = await getOrdersAsync(DEFAULT_LOCATION_ID);
      setOrders(data);
    } catch (err) {
      console.error('Failed to fetch active orders:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 30000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => {
    getBoardSettingsAsync('orders', DEFAULT_LOCATION_ID)
      .then(setColumns)
      .catch((err) => console.error('Failed to load order board settings:', err));
  }, []);

  useEffect(() => {
    return subscribeToPosEvents({
      onOrderCreated: () => { void fetchOrders(); },
      onOrderUpdated: () => { void fetchOrders(); },
    });
  }, [fetchOrders]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'dine_in' | 'glovo' | 'ubereats'>('all');
  const [isMinimized, setIsMinimized] = useState(false);
  const [location, setLocation] = useState('All Locations');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalInitialView, setModalInitialView] = useState<'default' | 'checkout' | 'split_bill' | 'discount' | 'tip'>('default');
  const [isCreateOrderOpen, setIsCreateOrderOpen] = useState(false);
  const [draggingOrderId, setDraggingOrderId] = useState<string | null>(null);

  const LOCATIONS = ['All Locations', 'Gothic', 'Sagrada', 'Gracia', 'Arc de Triumph', 'Eixample', 'HQ'];

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const updated = await updateOrderStatusAsync(orderId, newStatus);
      setOrders(prev => prev.map(o => o.id === orderId ? updated : o));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
    } catch (err) {
      console.error('Failed to update order status:', err);
    }
  };

  const updateOrder = async (updatedOrder: Order) => {
    try {
      const updated = await updateOrderAsync(updatedOrder.id, updatedOrder);
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      if (selectedOrder?.id === updated.id) setSelectedOrder(updated);
    } catch (err) {
      console.error('Failed to update order:', err);
    }
  };

  const handlePaymentComplete = async (updated: Order) => {
    if (updated.paid) {
      setOrders(prev => prev.filter(o => o.id !== updated.id));
      setSelectedOrder(null);
    } else {
      setOrders(prev => prev.map(o => o.id === updated.id ? updated : o));
      setSelectedOrder(updated);
    }
    await fetchOrders();
  };

  const SourceBadge = ({ source }: { source: OrderSource }) => {
    switch (source) {
      case 'glovo':
        return <img src="https://upload.wikimedia.org/wikipedia/commons/d/d9/Logotip_de_Glovo.png" alt="Glovo" className="h-5 object-contain" />;
      case 'ubereats':
        return <img src="https://1000logos.net/wp-content/uploads/2021/04/Uber-Eats-logo.png" alt="Uber Eats" className="h-[22px] object-contain" />;
      case 'dine_in':
        return <div className="flex items-center gap-1.5 px-2.5 py-1 bg-gray-100 text-gray-700 font-bold text-[11px] rounded-lg"><Store size={12} /> DINE-IN</div>;
      case 'takeaway':
        return <div className="flex items-center gap-1.5 px-2.5 py-1 bg-orange-100 text-orange-700 font-bold text-[11px] rounded-lg"><ShoppingBag size={12} /> TAKEAWAY</div>;
    }
  };

  const timeAgo = (date: Date) => {
    const mins = Math.floor((Date.now() - date.getTime()) / 60000);
    if (mins === 0) return 'Just now';
    return `${mins}m ago`;
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between p-6 border-b border-gray-100 bg-white z-10 shrink-0 gap-4 w-full">
        {/* Title and Description */}
        <div className="flex flex-col sm:flex-row sm:items-baseline xl:flex-col xl:items-start justify-between gap-2 shrink-0">
          <h1 className="text-2xl font-black text-gray-900 tracking-tight whitespace-nowrap">Active Orders</h1>
          <p className="text-sm text-gray-500 font-medium whitespace-nowrap">Manage POS and Delivery Aggregator orders.</p>
        </div>
        
        {/* Controls Area (Responsive Flex Ordering) */}
        <div className="flex flex-wrap xl:flex-nowrap items-center gap-x-3 gap-y-1.5 xl:gap-3 w-full xl:w-auto xl:justify-end">
          
          {/* 1. Location */}
          {/* Tablet: Top Left (order-1) | PC: Pos 1 (xl:order-1) */}
          <div className="order-1 xl:order-1 shrink-0">
            <div className="relative">
              <div 
                onClick={() => setIsLocationOpen(!isLocationOpen)}
                className="flex items-center justify-center gap-2 px-3 h-[38px] bg-gray-50 border border-gray-200 rounded-[10px] cursor-pointer hover:bg-gray-100 transition-colors shrink-0"
              >
                <MapPin size={16} className="text-gray-500" />
                <span className="text-[13px] font-bold text-gray-700 whitespace-nowrap">{location}</span>
                <ChevronDown size={14} className="text-gray-400" />
              </div>

              <AnimatePresence>
                {isLocationOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setIsLocationOpen(false)} />
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      transition={{ duration: 0.15 }}
                      className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl z-50 w-[200px] py-2"
                    >
                      {LOCATIONS.map(l => (
                        <button 
                          key={l}
                          onClick={() => { setLocation(l); setIsLocationOpen(false); }}
                          className="w-full text-left px-4 py-2.5 text-[14px] font-bold text-gray-700 hover:bg-gray-50 flex items-center justify-between group cursor-pointer"
                        >
                          {l}
                          {location === l && <CheckSquare size={16} className="text-corgi" />}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* 2. Tabs (extraHeaderActions) */}
          {/* Tablet: Top Right (order-2) | PC: Pos 6 (xl:order-6) */}
          {extraHeaderActions && (
            <div className="order-2 xl:order-6 flex items-center ml-auto xl:ml-0 shrink-0">
              <div className="hidden xl:block h-6 w-px bg-gray-200 mr-3 shrink-0" />
              {extraHeaderActions}
            </div>
          )}

          {/* 3. Force Line Break on Tablet */}
          <div className="w-full basis-full xl:hidden order-3" />

          {/* 4. Filters */}
          {/* Tablet: Bottom Left (order-4) | PC: Pos 2 (xl:order-2) */}
          <div className="order-4 xl:order-2 shrink-0">
            <div className="flex items-center gap-0.5 bg-gray-50/80 p-0.5 h-[40px] rounded-[10px] border border-gray-200/60 shrink-0">
              {(['all', 'dine_in', 'glovo', 'ubereats'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-3 h-full rounded-lg text-[13px] font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${activeFilter === f ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
                >
                  {f === 'all' ? 'All' : f === 'dine_in' ? 'Dine-in' : f === 'glovo' ? 'Glovo' : 'Uber Eats'}
                </button>
              ))}
            </div>
          </div>

          {/* 5. PC Divider */}
          {/* Tablet: Hidden | PC: Pos 3 (xl:order-3) */}
          <div className="hidden xl:block h-6 w-px bg-gray-200 shrink-0 order-3" />

          {/* 6. Actions */}
          {/* Tablet: Bottom Right (order-5) | PC: Pos 4 (xl:order-4) */}
          <div className="order-5 xl:order-4 flex items-center gap-3 ml-auto xl:ml-0 shrink-0">
            <button 
              onClick={() => setIsMinimized(!isMinimized)}
              className="w-[38px] h-[38px] shrink-0 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-[10px] transition-all border border-gray-200 cursor-pointer active:scale-95"
              title={isMinimized ? "Maximize Cards" : "Minimize Cards"}
            >
              {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
            </button>

            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="flex shrink-0 items-center justify-center gap-2 px-3 h-[38px] bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-[10px] font-bold transition-all text-[13px] border border-gray-200 cursor-pointer active:scale-95"
            >
              <Settings size={16} /> <span className="whitespace-nowrap">Board Settings</span>
            </button>

            <button 
              onClick={() => setIsCreateOrderOpen(true)}
              className="flex shrink-0 items-center justify-center gap-2 px-4 h-[38px] bg-corgi hover:brightness-110 text-white rounded-[10px] font-bold transition-all text-[13px] shadow-sm cursor-pointer active:scale-95"
            >
              <Plus size={16} /> <span className="whitespace-nowrap">Create Order</span>
            </button>
          </div>

        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex gap-6 p-6 overflow-x-auto custom-scrollbar bg-ui-beige/30">
        {columns.map(col => {
          const colOrders = sortOrdersOldestFirst(
            filterOrdersForColumn(orders, col.id, activeFilter)
          );
          
          return (
            <div
              key={col.id}
              className="flex-1 min-w-[320px] max-w-[400px] flex flex-col"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const orderId = e.dataTransfer.getData('text/plain');
                if (!orderId) return;
                const order = orders.find((o) => o.id === orderId);
                if (order && order.status !== col.id) {
                  void updateOrderStatus(orderId, col.id);
                }
                setDraggingOrderId(null);
              }}
            >
              <div className="flex items-center justify-between mb-4 px-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-gray-900">{col.label}</h3>
                </div>
                <div className="bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-md">
                  {colOrders.length}
                </div>
              </div>

              <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pb-10">
                <AnimatePresence>
                  {colOrders.map(order => (
                    <motion.div
                      key={order.id}
                      layoutId={`order-${order.id}`}
                      draggable
                      onDragStart={(e) => {
                        e.stopPropagation();
                        setDraggingOrderId(order.id);
                        e.dataTransfer.setData('text/plain', order.id);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onDragEnd={() => setDraggingOrderId(null)}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: draggingOrderId === order.id ? 0.5 : 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        if (draggingOrderId) return;
                        setModalInitialView('default');
                        setSelectedOrder(order);
                      }}
                      className={`bg-white rounded-2xl border overflow-hidden shadow-sm transition-all shrink-0 cursor-pointer hover:shadow-md ${
                        order.source === 'glovo' ? 'border-[#FFC244]/40 shadow-[#FFC244]/10' : 
                        order.source === 'ubereats' ? 'border-[#06C167]/40 shadow-[#06C167]/10' : 
                        'border-gray-100'
                      }`}
                    >
                      {isMinimized ? (
                        <div className="p-3 pb-2">
                          <div className="flex justify-between items-center mb-1.5">
                            <div className="flex items-center gap-2">
                              <h4 className="text-[15px] font-black text-gray-900 leading-none">{order.id}</h4>
                              <div className="scale-[0.8] origin-left">
                                <SourceBadge source={order.source} />
                              </div>
                            </div>
                            <div suppressHydrationWarning className="flex items-center gap-1 text-gray-400 text-[10px] font-medium leading-none">
                              <Clock size={10} />
                              {timeAgo(order.time)}
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] font-semibold text-gray-500 truncate">{order.customerName}</p>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold">
                              <span className={order.paid ? "text-green-600" : "text-red-500"}>
                                {order.paid ? 'Paid' : 'Not Paid'}
                              </span>
                              {order.readyByTime && (
                                <span className="text-orange-600">• {order.readyByTime}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-5 pb-3">
                          <div className="flex justify-between items-start mb-3">
                            <SourceBadge source={order.source} />
                            <div suppressHydrationWarning className="flex items-center gap-1.5 text-gray-400 text-xs font-medium">
                              <Clock size={12} />
                              {timeAgo(order.time)}
                            </div>
                          </div>
                          
                          <div>
                            <h4 className="text-lg font-black text-gray-900">{order.id}</h4>
                            <p className="text-sm font-semibold text-gray-500">{order.customerName}</p>
                            {order.deliveryId && <p className="text-xs text-gray-400 mt-1 flex items-center gap-1"><MapPin size={10}/> Courier ID: {order.deliveryId}</p>}
                            <div className="flex items-center justify-between mt-3 text-[11px] font-bold">
                              <div className="flex items-center gap-2">
                                <span className={order.paid ? "text-green-600 bg-green-50 px-2 py-0.5 rounded-md" : "text-red-500 bg-red-50 px-2 py-0.5 rounded-md"}>
                                  {order.paid ? 'Paid' : 'Not Paid'}
                                </span>
                                <span className="text-gray-400">
                                  {order.orderedBy === 'app' ? 'via App' : 'via Waiter'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {!isMinimized && (
                        <div className="px-5 py-3 border-y border-gray-50 bg-gray-50/50">
                          {(() => {
                            const grouped = groupItemsKitchenVsBar(order.items);
                            const hasBar = grouped.bar.length > 0;
                            const hasKitchen = grouped.kitchen.length > 0;
                            if (hasBar || hasKitchen) {
                              return (
                                <div className="space-y-3 mb-3">
                                  {hasKitchen && (
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-wider text-orange-600 mb-1">Kitchen</p>
                                      <div className="space-y-1">
                                        {grouped.kitchen.map((line) => (
                                          <p key={line} className="text-[13px] font-bold text-gray-700">{line}</p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                  {hasBar && (
                                    <div>
                                      <p className="text-[10px] font-black uppercase tracking-wider text-blue-600 mb-1">Bar</p>
                                      <div className="space-y-1">
                                        {grouped.bar.map((line) => (
                                          <p key={line} className="text-[13px] font-bold text-gray-700">{line}</p>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            }
                            return (
                              <div className="space-y-2 mb-3">
                                {order.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-start text-[13px]">
                                    <div className="flex gap-2">
                                      <span className="text-gray-400 font-bold">{item.quantity}x</span>
                                      <span className="font-bold text-gray-700">{item.name}</span>
                                    </div>
                                    <span className="font-bold text-gray-500">€{item.price.toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="font-black text-gray-900 text-lg">€{order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className={`${isMinimized ? 'px-3 pb-3 pt-2' : 'px-5 pb-5 pt-3'} flex gap-2 bg-white`}>
                        {order.status === 'incoming' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'preparing'); }}
                            className={`flex-1 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors cursor-pointer active:scale-95 ${isMinimized ? 'py-1.5 text-[12px]' : 'py-2 text-sm'}`}
                          >
                            {isMinimized ? 'Accept' : 'Accept & Prepare'}
                          </button>
                        )}
                        {order.status === 'preparing' && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              const nextStatus = (order.source === 'glovo' || order.source === 'ubereats') ? 'ready' : 'served';
                              updateOrderStatus(order.id, nextStatus); 
                            }}
                            className={`flex-1 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-opacity cursor-pointer active:scale-95 ${isMinimized ? 'py-1.5 text-[12px]' : 'py-2 text-sm'}`}
                          >
                            {(order.source === 'glovo' || order.source === 'ubereats') ? 'Mark Ready' : 'Mark Served'}
                          </button>
                        )}
                        {order.status === 'ready' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'served'); }}
                            className={`flex-1 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors cursor-pointer active:scale-95 flex items-center justify-center ${isMinimized ? 'py-1.5 text-[12px] gap-1' : 'py-2 text-sm gap-1.5'}`}
                          >
                            <Check size={isMinimized ? 14 : 16}/> {isMinimized ? 'Served' : 'Mark Served'}
                          </button>
                        )}
                        {order.status === 'served' && !order.paid && (
                          <button 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              setModalInitialView('default');
                              setSelectedOrder(order); 
                            }}
                            className={`flex-1 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-colors cursor-pointer active:scale-95 flex items-center justify-center ${isMinimized ? 'py-1.5 text-[12px] gap-1' : 'py-2 text-sm gap-1.5'}`}
                          >
                            <CreditCard size={isMinimized ? 14 : 16}/> Checkout
                          </button>
                        )}
                        {(order.status === 'incoming' || order.status === 'preparing') && (
                           <button 
                             onClick={(e) => { e.stopPropagation(); setOrderToCancel(order.id); }}
                             className={`flex items-center justify-center bg-gray-100 text-gray-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors cursor-pointer active:scale-95 ${isMinimized ? 'w-8 h-8' : 'w-10 h-10'}`}
                             title="Cancel Order"
                           >
                             <X size={isMinimized ? 14 : 16}/>
                           </button>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {colOrders.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-200 rounded-2xl text-gray-400">
                    <AlertCircle size={24} className="mb-2 opacity-20" />
                    <p className="text-sm font-medium">No orders</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <BoardSettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        stages={columns}
        boardType="orders"
        lockedStages={['incoming', 'preparing', 'ready', 'served', 'completed', 'cancelled']}
        tasksWithStatus={orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)}
        onSave={async (newStages, migrations) => {
          try {
            const saved = await saveBoardSettingsAsync('orders', newStages, DEFAULT_LOCATION_ID);
            setColumns(saved);

            for (const migration of migrations) {
              const affected = orders.filter((o) => o.status === migration.from);
              for (const order of affected) {
                await updateOrderStatusAsync(order.id, migration.to);
              }
            }
            await fetchOrders();
            setIsSettingsOpen(false);
          } catch (err) {
            console.error('Failed to save order board settings:', err);
            throw err;
          }
        }}
      />

      <AnimatePresence>
        {orderToCancel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl"
            >
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <AlertCircle size={24} />
                <h3 className="text-xl font-black text-gray-900">Cancel Order?</h3>
              </div>
              <p className="text-gray-500 font-medium mb-6 leading-relaxed">
                Are you sure you want to cancel order <span className="font-bold text-gray-900">{orderToCancel}</span>? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setOrderToCancel(null)}
                  className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer active:scale-95"
                >
                  Keep Order
                </button>
                <button 
                  onClick={() => {
                    updateOrderStatus(orderToCancel, 'cancelled');
                    setOrderToCancel(null);
                  }}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl transition-colors cursor-pointer active:scale-95"
                >
                  Yes, Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <OrderDetailsModal 
        order={selectedOrder}
        isOpen={!!selectedOrder}
        initialView={modalInitialView}
        onClose={() => setSelectedOrder(null)}
        onUpdateStatus={updateOrderStatus}
        onUpdateOrder={updateOrder}
        onPaymentComplete={handlePaymentComplete}
      />

      {isCreateOrderOpen && (
        <OrderTerminalModal
          tableId="takeaway"
          tableName="Takeaway / Walk-in"
          currentStatus="available"
          onClose={() => setIsCreateOrderOpen(false)}
          onAction={async (action, items, discountPercent, customerId) => {
            if (action === 'send_to_kitchen' || action === 'pay') {
              const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
              const discountAmount = subtotal * discountPercent;
              const finalTotal = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));
              const formattedItems = items.map(i => ({
                name: i.name,
                price: i.price,
                quantity: i.quantity,
                comments: i.comments
              }));

              const finalCustomerId = customerId || undefined;
              const guests = await getGuestsAsync();
              const guestName = finalCustomerId
                ? guests.find((g) => g.id === finalCustomerId)?.name || 'Guest'
                : 'Walk-in (POS)';

              try {
                const newOrder = await createOrderAsync({
                  source: 'takeaway',
                  customerName: guestName,
                  customerId: finalCustomerId,
                  items: formattedItems,
                  total: finalTotal,
                  discount: discountPercent > 0 ? {
                    name: 'Manual Discount',
                    value: discountPercent,
                    amountDeducted: discountAmount
                  } : undefined,
                  status: 'incoming',
                  paid: false,
                  orderedBy: 'waiter',
                });

                await fetchOrders();

                if (action === 'pay') {
                  setSelectedOrder(newOrder);
                  setModalInitialView('checkout');
                } else {
                  setSelectedOrder(newOrder);
                  setModalInitialView('default');
                }
              } catch (err) {
                console.error('Failed to create order from POS:', err);
              }
            }
            setIsCreateOrderOpen(false);
          }}
        />
      )}
    </div>
  );
}
