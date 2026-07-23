import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Clock, Check, MoreHorizontal, AlertCircle, Bike, MapPin, Store, Settings, X, ChevronDown, Minimize2, Maximize2, CheckSquare, CreditCard, Plus } from 'lucide-react';
import BoardSettingsModal, { Stage } from './BoardSettingsModal';
import OrderDetailsModal from './OrderDetailsModal';

import { Order, OrderItem, OrderSource, getOrders, saveOrders } from '@/lib/orders';

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-001',
    source: 'dine_in',
    customerName: 'Table 4',
    items: [{ name: 'Corgi Latte', quantity: 2, price: 4.5 }, { name: 'Avocado Toast', quantity: 1, price: 8.0 }],
    total: 17.0,
    status: 'preparing',
    time: new Date(Date.now() - 15 * 60000),
    paid: false,
    orderedBy: 'waiter',
  },
  {
    id: 'GLV-892',
    source: 'glovo',
    customerName: 'Anna S.',
    items: [{ name: 'Matcha Croissant', quantity: 2, price: 3.5 }, { name: 'Flat White', quantity: 1, price: 3.8 }],
    total: 10.8,
    status: 'incoming',
    time: new Date(Date.now() - 2 * 60000),
    deliveryId: 'G-12948',
    paid: true,
    orderedBy: 'app',
    readyByTime: '15:45',
  },
  {
    id: 'UBR-441',
    source: 'ubereats',
    customerName: 'David M.',
    items: [{ name: 'Brunch Set For 2', quantity: 1, price: 24.0 }],
    total: 24.0,
    status: 'ready',
    time: new Date(Date.now() - 25 * 60000),
    deliveryId: 'U-9921A',
    paid: true,
    orderedBy: 'app',
    readyByTime: '16:00',
  },
  {
    id: 'ORD-002',
    source: 'takeaway',
    customerName: 'Walk-in (John)',
    items: [{ name: 'Americano', quantity: 1, price: 3.0 }, { name: 'Blueberry Muffin', quantity: 2, price: 3.5 }],
    total: 10.0,
    status: 'new',
    time: new Date(Date.now() - 1 * 60000),
    paid: true,
    orderedBy: 'waiter',
  },
  {
    id: 'GLV-893',
    source: 'glovo',
    customerName: 'Elena P.',
    items: [{ name: 'Iced Latte', quantity: 1, price: 4.5 }, { name: 'Vegan Wrap', quantity: 1, price: 7.5 }],
    total: 12.0,
    status: 'preparing',
    time: new Date(Date.now() - 8 * 60000),
    deliveryId: 'G-12950',
    paid: true,
    orderedBy: 'app',
    readyByTime: '16:10',
  },
  {
    id: 'ORD-003',
    source: 'dine_in',
    customerName: 'Table 7',
    items: [
      { name: 'Cappuccino', quantity: 3, price: 4.0 }, 
      { name: 'Cheesecake', quantity: 3, price: 5.5 },
      { name: 'Eggs Benedict', quantity: 2, price: 12.0 },
      { name: 'Fresh Orange Juice', quantity: 2, price: 4.5 },
      { name: 'Avocado Toast', quantity: 1, price: 9.5 },
      { name: 'Extra Bacon', quantity: 1, price: 2.5 }
    ],
    total: 73.5,
    status: 'preparing',
    time: new Date(Date.now() - 12 * 60000),
    paid: false,
    orderedBy: 'waiter',
  },
  {
    id: 'UBR-442',
    source: 'ubereats',
    customerName: 'Michael B.',
    items: [{ name: 'Espresso', quantity: 2, price: 2.5 }, { name: 'Croissant', quantity: 2, price: 2.8 }],
    total: 10.6,
    status: 'new',
    time: new Date(Date.now() - 3 * 60000),
    deliveryId: 'U-9922B',
    paid: true,
    orderedBy: 'app',
    readyByTime: '16:15',
  },
  {
    id: 'ORD-004',
    source: 'takeaway',
    customerName: 'Sarah L.',
    items: [{ name: 'Matcha Latte', quantity: 1, price: 5.0 }],
    total: 5.0,
    status: 'ready',
    time: new Date(Date.now() - 18 * 60000),
    paid: true,
    orderedBy: 'waiter',
  },
  {
    id: 'GLV-894',
    source: 'glovo',
    customerName: 'Tom H.',
    items: [{ name: 'Corgi Special Breakfast', quantity: 2, price: 14.0 }, { name: 'Orange Juice', quantity: 2, price: 4.0 }],
    total: 36.0,
    status: 'ready',
    time: new Date(Date.now() - 30 * 60000),
    deliveryId: 'G-12955',
    paid: true,
    orderedBy: 'app',
    readyByTime: '15:30',
  },
  {
    id: 'ORD-005',
    source: 'dine_in',
    customerName: 'Table 2',
    items: [
      { name: 'Mocha', quantity: 1, price: 4.8 }, 
      { name: 'Chocolate Chip Cookie', quantity: 1, price: 2.5 },
      { name: 'Latte Macchiato', quantity: 2, price: 4.5 },
      { name: 'Cinnamon Roll', quantity: 1, price: 3.5 },
      { name: 'English Breakfast Tea', quantity: 1, price: 3.0 }
    ],
    total: 22.8,
    status: 'served',
    time: new Date(Date.now() - 45 * 60000),
    paid: false,
    orderedBy: 'waiter',
  },
  {
    id: 'UBR-443',
    source: 'ubereats',
    customerName: 'Jessica W.',
    items: [{ name: 'Smoothie Bowl', quantity: 1, price: 9.0 }, { name: 'Iced Americano', quantity: 1, price: 3.5 }],
    total: 12.5,
    status: 'served',
    time: new Date(Date.now() - 50 * 60000),
    deliveryId: 'U-9925C',
    paid: true,
    orderedBy: 'app',
    readyByTime: '15:00',
  },
  {
    id: 'ORD-006',
    source: 'dine_in',
    customerName: 'Table 10',
    items: [{ name: 'Filter Coffee', quantity: 4, price: 3.0 }, { name: 'Banana Bread', quantity: 2, price: 4.5 }],
    total: 21.0,
    status: 'new',
    time: new Date(Date.now() - 4 * 60000),
    paid: false,
    orderedBy: 'waiter',
  }
];

const COLUMNS = [
  { id: 'incoming', label: 'Incoming', color: 'bg-yellow-500' },
  { id: 'new', label: 'New Orders', color: 'bg-blue-500' },
  { id: 'preparing', label: 'Preparing', color: 'bg-orange-500' },
  { id: 'served', label: 'Served', color: 'bg-indigo-500' },
  { id: 'ready', label: 'Ready for Pickup', color: 'bg-green-500' },
  { id: 'completed', label: 'Completed', color: 'bg-purple-500' },
  { id: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
];

interface OrdersBoardProps {
  extraHeaderActions?: React.ReactNode;
}

export default function OrdersBoard({ extraHeaderActions }: OrdersBoardProps = {}) {
  const [columns, setColumns] = useState<Stage[]>(COLUMNS);
  const [orders, setOrders] = useState<Order[]>([]);
  
  // Load and seed orders on mount
  useEffect(() => {
    const stored = getOrders();
    if (stored.length > 0) {
      setOrders(stored);
    } else {
      saveOrders(MOCK_ORDERS);
      setOrders(MOCK_ORDERS);
    }
  }, []);

  // Persist orders on change
  useEffect(() => {
    if (orders.length > 0) {
      saveOrders(orders);
    }
  }, [orders]);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'dine_in' | 'glovo' | 'ubereats'>('all');
  const [isMinimized, setIsMinimized] = useState(false);
  const [location, setLocation] = useState('All Locations');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [orderToCancel, setOrderToCancel] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [modalInitialView, setModalInitialView] = useState<'default' | 'checkout' | 'split_bill' | 'discount' | 'tip'>('default');

  const LOCATIONS = ['All Locations', 'Gothic', 'Sagrada', 'Gracia', 'Arc de Triumph', 'Eixample', 'HQ'];

  const simulateIncoming = (source: 'glovo' | 'ubereats') => {
    const isGlovo = source === 'glovo';
    const newOrder: Order = {
      id: `${isGlovo ? 'GLV' : 'UBR'}-${Math.floor(Math.random() * 1000)}`,
      source,
      customerName: isGlovo ? 'Maria V.' : 'Carlos T.',
      items: [
        { name: 'Iced Latte', quantity: 1, price: 4.5 },
        { name: 'Cinnamon Roll', quantity: 1, price: 4.0 }
      ],
      total: 8.5,
      status: 'incoming',
      time: new Date(),
      deliveryId: `${isGlovo ? 'G' : 'U'}-${Math.floor(Math.random() * 10000)}`,
      paid: true,
      orderedBy: 'app',
      readyByTime: new Date(Date.now() + 20 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setOrders(prev => [newOrder, ...prev]);
  };

  const updateOrderStatus = (orderId: string, newStatus: string) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o));
  };

  const updateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    if (selectedOrder && selectedOrder.id === updatedOrder.id) {
      setSelectedOrder(updatedOrder);
    }
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
      <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-white z-10 shrink-0">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Active Orders</h1>
          <p className="text-sm text-gray-500 font-medium mt-1">Manage POS and Delivery Aggregator orders.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <div 
              onClick={() => setIsLocationOpen(!isLocationOpen)}
              className="flex items-center justify-center gap-2 px-3 h-[38px] bg-gray-50 border border-gray-200 rounded-[10px] cursor-pointer hover:bg-gray-100 transition-colors"
            >
              <MapPin size={16} className="text-gray-500" />
              <span className="text-[13px] font-bold text-gray-700">{location}</span>
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

          <div className="flex items-center gap-0.5 bg-gray-50/80 p-0.5 h-[40px] rounded-[10px] border border-gray-200/60">
            {(['all', 'dine_in', 'glovo', 'ubereats'] as const).map(f => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-3 h-full rounded-lg text-[13px] font-bold transition-all cursor-pointer ${activeFilter === f ? 'bg-white text-gray-900 shadow-sm border border-gray-200/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'}`}
              >
                {f === 'all' ? 'All' : f === 'dine_in' ? 'Dine-in' : f === 'glovo' ? 'Glovo' : 'Uber Eats'}
              </button>
            ))}
          </div>

          <div className="h-6 w-px bg-gray-200 mx-1" />

          <button 
            onClick={() => setIsMinimized(!isMinimized)}
            className="w-[38px] h-[38px] flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-[10px] transition-all border border-gray-200 cursor-pointer active:scale-95"
            title={isMinimized ? "Maximize Cards" : "Minimize Cards"}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>

          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center justify-center gap-2 px-3 h-[38px] bg-gray-50 hover:bg-gray-100 text-gray-600 hover:text-gray-900 rounded-[10px] font-bold transition-all text-[13px] border border-gray-200 cursor-pointer active:scale-95"
          >
            <Settings size={16} /> Board Settings
          </button>

          <button 
            onClick={() => {}} // Placeholder for now
            className="flex items-center justify-center gap-2 px-4 h-[38px] bg-corgi hover:brightness-110 text-white rounded-[10px] font-bold transition-all text-[13px] shadow-sm cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={16} /> Create Order
          </button>

          {extraHeaderActions && (
            <>
              <div className="h-6 w-px bg-gray-200 mx-1 shrink-0" />
              {extraHeaderActions}
            </>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 flex gap-6 p-6 overflow-x-auto custom-scrollbar bg-ui-beige/30">
        {columns.map(col => {
          const colOrders = orders
            .filter(o => o.status === col.id)
            .filter(o => {
              if (activeFilter === 'all') return true;
              if (activeFilter === 'dine_in') return o.source === 'dine_in' || o.source === 'takeaway';
              return o.source === activeFilter;
            })
            .sort((a, b) => b.time.getTime() - a.time.getTime());
          
          return (
            <div key={col.id} className="flex-1 min-w-[320px] max-w-[400px] flex flex-col">
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
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
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
                          <div className="flex justify-between items-center pt-3 border-t border-gray-200">
                            <span className="font-bold text-gray-900">Total</span>
                            <span className="font-black text-gray-900 text-lg">€{order.total.toFixed(2)}</span>
                          </div>
                        </div>
                      )}
                      
                      <div className={`${isMinimized ? 'px-3 pb-3 pt-2' : 'px-5 pb-5 pt-3'} flex gap-2 bg-white`}>
                        {order.status === 'incoming' && (
                          <button 
                            onClick={(e) => { e.stopPropagation(); updateOrderStatus(order.id, 'new'); }}
                            className={`flex-1 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors cursor-pointer active:scale-95 shadow-sm ${isMinimized ? 'py-1.5 text-[12px]' : 'py-2 text-sm'}`}
                          >
                            {isMinimized ? 'Accept' : 'Accept Order'}
                          </button>
                        )}
                        {order.status === 'new' && (
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
                        {(order.status === 'new' || order.status === 'preparing') && (
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
        lockedStages={['new', 'preparing', 'ready', 'served', 'completed', 'cancelled']}
        tasksWithStatus={orders.reduce((acc, order) => {
          acc[order.status] = (acc[order.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)}
        onSave={(newStages, migrations) => {
          setColumns(newStages);
          setOrders(prev => prev.map(o => {
            const migration = migrations.find(m => m.from === o.status);
            if (migration) {
              return { ...o, status: migration.to as Order['status'] };
            }
            return o;
          }));
          setIsSettingsOpen(false);
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
      />
    </div>
  );
}
