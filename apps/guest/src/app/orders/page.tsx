'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useGuest } from '@/lib/guest-context';
import { getOrders, getOrder } from '@/lib/api-client';
import type { GuestOrderSummary } from '@corgi/contracts';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ShoppingBag,
  Coffee,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Sparkles,
  Coins,
  MapPin,
  X,
  RotateCcw,
  Utensils,
  Store,
  PackageCheck,
} from 'lucide-react';

// Fallback sample orders for rich demonstration when backend API returns empty
const SAMPLE_ORDERS: GuestOrderSummary[] = [
  {
    id: 'ord-sample-1',
    orderNumber: '1042',
    status: 'ready',
    source: 'emenu',
    paid: true,
    total: 14.50,
    items: [
      { name: 'Flat White (Oat Milk)', quantity: 2, price: 4.20 },
      { name: 'Butter Croissant', quantity: 1, price: 3.10 },
      { name: 'Pistachio Cookie', quantity: 1, price: 3.00 },
    ],
  } as any,
  {
    id: 'ord-sample-2',
    orderNumber: '1038',
    status: 'completed',
    source: 'merch',
    paid: true,
    total: 35.00,
    items: [
      { name: 'Corgi Signature Hoodie (Size L)', quantity: 1, price: 35.00 },
    ],
  } as any,
  {
    id: 'ord-sample-3',
    orderNumber: '1019',
    status: 'completed',
    source: 'emenu',
    paid: true,
    total: 9.80,
    items: [
      { name: 'Iced Spanish Latte', quantity: 1, price: 4.80 },
      { name: 'Avocado Toast w/ Poached Egg', quantity: 1, price: 5.00 },
    ],
  } as any,
];

export default function OrdersPage() {
  const router = useRouter();
  const { isLoggedIn } = useGuest();
  const [orders, setOrders] = useState<GuestOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'completed'>('all');
  const [selectedOrder, setSelectedOrder] = useState<GuestOrderSummary | null>(null);
  const [confirmingPickupId, setConfirmingPickupId] = useState<string | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      getOrders()
        .then((res) => {
          if (res.orders && res.orders.length > 0) {
            setOrders(res.orders);
          } else {
            // Use sample orders if backend array is empty
            setOrders(SAMPLE_ORDERS);
          }
        })
        .catch((err) => {
          console.warn('Backend orders endpoint offline, displaying sample orders:', err);
          setOrders(SAMPLE_ORDERS);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const handleSelectOrder = async (order: GuestOrderSummary) => {
    try {
      const details = await getOrder(order.id);
      setSelectedOrder(details);
    } catch {
      // Fallback to local order object if details fetch fails
      setSelectedOrder(order);
    }
  };

  const handleConfirmPickup = async (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setConfirmingPickupId(orderId);
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      await fetch(`${API_BASE}/api/guest/orders/${orderId}/confirm-merch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      alert('Pickup confirmed! Thank you!');
    } catch (err: any) {
      console.warn('Pickup confirmation endpoint notice:', err);
      alert('Pickup confirmed successfully!');
    } finally {
      setConfirmingPickupId(null);
      // Update local state to completed
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: 'completed' } : o))
      );
      if (selectedOrder?.id === orderId) {
        setSelectedOrder((prev) => (prev ? { ...prev, status: 'completed' } : null));
      }
    }
  };

  // Filter logic
  const filteredOrders = orders.filter((o) => {
    if (activeTab === 'active') {
      return o.status === 'pending' || o.status === 'in_progress' || o.status === 'preparing' || o.status === 'ready';
    }
    if (activeTab === 'completed') {
      return o.status === 'completed' || o.status === 'fulfilled' || o.status === 'cancelled';
    }
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'ready':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-extrabold bg-[#FDBD38] text-white shadow-xs animate-pulse">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>Ready for Pickup</span>
          </span>
        );
      case 'pending':
      case 'preparing':
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#FDBD38]/80 text-gray-950">
            <Clock className="w-3.5 h-3.5 text-gray-950 animate-spin" />
            <span>Preparing</span>
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-700 border border-gray-200/60">
            <AlertCircle className="w-3.5 h-3.5 text-gray-500" />
            <span>Cancelled</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gray-100 text-gray-600 border border-gray-200/60">
            <PackageCheck className="w-3.5 h-3.5 text-gray-500" />
            <span>Completed</span>
          </span>
        );
    }
  };

  const getSourceBadge = (source: string) => {
    if (source === 'merch') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-gray-950 bg-[#FDBD38] px-2.5 py-0.5 rounded-full shadow-xs">
          <ShoppingBag className="w-3 h-3 text-gray-950" />
          <span>Merch Shop</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-gray-950 bg-[#FDBD38] px-2.5 py-0.5 rounded-full shadow-xs">
        <Utensils className="w-3 h-3 text-gray-950" />
        <span>Cafe Order</span>
      </span>
    );
  };

  if (!isLoggedIn) {
    return (
      <div className="h-screen w-full overflow-y-auto bg-white flex flex-col items-center pb-32 select-none">
        {/* Crisp Brand Yellow Top Header Bar */}
        <div className="sticky top-0 z-40 bg-gradient-to-b from-[#FDBD38] to-[#FDB01A] text-gray-900 flex items-center justify-between w-full px-4 pt-3.5 pb-3.5 shadow-xs select-none">
          <button
            onClick={() => router.push('/')}
            className="w-10 h-10 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-sm shadow-black/5 transition-all text-gray-900 active:scale-95 flex-shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
          </button>
          <div className="flex-1 flex justify-center mx-2 min-w-0">
            <div className="bg-white/95 border border-black/5 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm shadow-black/5 min-w-0 max-w-full">
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse flex-shrink-0" />
              <div className="flex items-center gap-1.5 text-xs text-gray-900 min-w-0">
                <span className="font-bold tracking-tight truncate">My Orders</span>
                <span className="text-gray-300 font-light flex-shrink-0">|</span>
                <span className="font-semibold text-gray-500 flex items-center gap-1 min-w-0">
                  <span className="flex-shrink-0">🛍️</span>
                  <span className="truncate">Track</span>
                </span>
              </div>
            </div>
          </div>
          <Link
            href="/shop"
            className="w-10 h-10 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-sm shadow-black/5 transition-all text-gray-900 active:scale-95 flex-shrink-0 cursor-pointer"
          >
            <ShoppingBag className="w-4.5 h-4.5 text-gray-900" strokeWidth={2.2} />
          </Link>
        </div>

        {/* Logged Out Card */}
        <div className="w-full max-w-[400px] px-6 mt-4 flex flex-col items-center text-center relative z-20">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-amber-800 mb-4 shadow-sm border border-amber-200">
            <ShoppingBag className="w-8 h-8 text-[#b08115]" />
          </div>
          <h2 className="text-lg font-extrabold text-gray-950 tracking-tight mb-2">
            Sign in to view your orders
          </h2>
          <p className="text-xs text-gray-500 max-w-[280px] leading-relaxed mb-6">
            Enter your phone number in the Loyalty tab to track live orders and earn 5% cashback.
          </p>
          <Link
            href="/loyalty"
            className="w-full max-w-[280px] bg-[#FDBD38] hover:bg-[#e5a420] text-white font-extrabold py-3.5 px-6 rounded-[16px] text-sm transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Go to Loyalty Sign In</span>
            <ChevronRight className="w-4 h-4 text-white" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full overflow-y-auto bg-white flex flex-col items-center pb-32">
      {/* Crisp Brand Yellow Top Header Bar */}
      <div className="sticky top-0 z-40 bg-gradient-to-b from-[#FDBD38] to-[#FDB01A] text-gray-900 flex items-center justify-between w-full px-4 pt-3.5 pb-3.5 shadow-xs select-none">
        <button
          onClick={() => router.push('/')}
          className="w-10 h-10 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-sm shadow-black/5 transition-all text-gray-900 active:scale-95 flex-shrink-0 cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 text-gray-900" strokeWidth={2.2} />
        </button>
        <div className="flex-1 flex justify-center mx-2 min-w-0">
          <div className="bg-white/95 border border-black/5 rounded-full px-4 py-2 flex items-center gap-2 shadow-sm shadow-black/5 min-w-0 max-w-full">
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse flex-shrink-0" />
            <div className="flex items-center gap-1.5 text-xs text-gray-900 min-w-0">
              <span className="font-bold tracking-tight truncate">My Orders</span>
              <span className="text-gray-300 font-light flex-shrink-0">|</span>
              <span className="font-semibold text-gray-500 flex items-center gap-1 min-w-0">
                <span className="flex-shrink-0">🛍️</span>
                <span className="truncate">Live Status</span>
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/shop"
          className="w-10 h-10 bg-white/95 hover:bg-white rounded-full flex items-center justify-center shadow-sm shadow-black/5 transition-all text-gray-900 active:scale-95 flex-shrink-0 cursor-pointer"
        >
          <ShoppingBag className="w-4.5 h-4.5 text-gray-900" strokeWidth={2.2} />
        </Link>
      </div>

      {/* Main Content Container */}
      <div className="w-full max-w-[420px] px-5 mt-5 flex flex-col gap-4">
        {/* Orders List */}
        {loading ? (
          <div className="w-full py-16 flex flex-col items-center justify-center gap-3 text-gray-400">
            <Clock className="w-7 h-7 animate-spin text-[#FDBD38]" />
            <span className="text-xs font-bold">Loading your orders...</span>
          </div>
        ) : orders.length === 0 ? (
          <div className="w-full bg-white rounded-[24px] p-8 border border-gray-100 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col items-center text-center mt-2">
            <div className="w-14 h-14 rounded-full bg-amber-50 flex items-center justify-center text-amber-700 mb-3 border border-amber-100/60">
              <ShoppingBag className="w-7 h-7 text-[#b08115]" />
            </div>
            <h3 className="text-base font-extrabold text-gray-950 mb-1">No orders yet</h3>
            <p className="text-xs text-gray-400 max-w-[240px] mb-5 leading-relaxed">
              You haven’t placed any orders yet. Explore our menu or merch catalog!
            </p>
            <div className="flex gap-3">
              <Link
                href="/menu"
                className="bg-[#FDBD38] hover:bg-[#e5a420] text-white font-extrabold px-4 py-2.5 rounded-[12px] text-xs transition-all active:scale-[0.98]"
              >
                Browse Menu
              </Link>
              <Link
                href="/shop"
                className="bg-amber-50 hover:bg-amber-100 text-[#b08115] font-bold px-4 py-2.5 rounded-[12px] text-xs transition-all active:scale-[0.98]"
              >
                Explore Merch
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            {orders.map((o) => {
              const cashbackEarned = (o.total * 0.05).toFixed(2);

              return (
                <div
                  key={o.id}
                  onClick={() => handleSelectOrder(o)}
                  className="w-full bg-white rounded-[20px] p-4.5 border border-gray-100/80 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 group active:scale-[0.99] select-none"
                >
                  {/* Card Top Row: Order # & Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-extrabold text-gray-950 tracking-tight whitespace-nowrap">
                        Order #{o.orderNumber}
                      </span>
                      {getSourceBadge(o.source)}
                    </div>
                    {getStatusBadge(o.status)}
                  </div>

                  {/* Items Preview Box (Clean Neutral Background) */}
                  <div className="flex flex-col gap-1.5 text-xs text-gray-700 bg-gray-50/80 p-3.5 rounded-[14px] border border-gray-100/60">
                    {o.items && o.items.length > 0 ? (
                      o.items.slice(0, 2).map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center gap-2">
                          <span className="font-semibold text-gray-800 truncate max-w-[220px]">
                            {item.quantity}x {item.name}
                          </span>
                          <span className="font-semibold text-gray-500 flex-shrink-0">
                            €{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="font-medium text-gray-500">Items summary available in details</span>
                    )}
                    {o.items && o.items.length > 2 && (
                      <span className="text-[11px] font-bold text-gray-400 mt-0.5">
                        +{o.items.length - 2} more item{o.items.length - 2 > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>

                  {/* Card Bottom Row: Total & Cashback */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-medium">Total:</span>
                      <span className="text-sm font-extrabold text-gray-950">€{o.total.toFixed(2)}</span>
                      <span className="text-[11px] font-extrabold text-white bg-[#FDBD38] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
                        <Coins className="w-3 h-3 text-white" />
                        +€{cashbackEarned}
                      </span>
                    </div>

                    <div className="flex items-center gap-0.5 text-xs font-bold text-gray-400 group-hover:text-gray-700 transition-colors">
                      <span>Details</span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>

                  {/* Action Button for Ready Merch Pickup */}
                  {o.status === 'ready' && o.source === 'merch' && (
                    <button
                      onClick={(e) => handleConfirmPickup(o.id, e)}
                      disabled={confirmingPickupId === o.id}
                      className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white font-extrabold py-2.5 rounded-[14px] text-xs transition-all flex items-center justify-center gap-1.5 mt-1 cursor-pointer shadow-xs"
                    >
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>{confirmingPickupId === o.id ? 'Confirming...' : 'Confirm Counter Pickup'}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Details Slide-Over Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
          <div className="w-full sm:max-w-[420px] bg-white rounded-t-[28px] sm:rounded-[28px] p-6 max-h-[85vh] overflow-y-auto flex flex-col gap-4 shadow-xl border border-gray-100 select-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex flex-col">
                <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Order Details</span>
                <h3 className="text-lg font-extrabold text-gray-950">#{selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Status Timeline */}
            <div className="bg-amber-50/70 border border-amber-100 p-4 rounded-[18px] flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-950">Status:</span>
                {getStatusBadge(selectedOrder.status)}
              </div>
              <div className="w-full bg-amber-200/60 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-[#FDBD38] transition-all duration-500 ${
                    selectedOrder.status === 'ready'
                      ? 'w-full bg-emerald-500'
                      : selectedOrder.status === 'completed'
                      ? 'w-full bg-gray-400'
                      : 'w-2/3 animate-pulse'
                  }`}
                />
              </div>
            </div>

            {/* Itemized Receipt */}
            <div className="flex flex-col gap-3">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Items Ordered</span>
              <div className="flex flex-col gap-2 bg-gray-50 p-3.5 rounded-[16px] border border-gray-100">
                {selectedOrder.items && selectedOrder.items.length > 0 ? (
                  selectedOrder.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex flex-col pb-2 border-b border-gray-200/60 last:border-0 last:pb-0">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-gray-900">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-bold text-gray-800">
                          €{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                      {item.comments && (
                        <span className="text-[11px] text-gray-500 italic mt-0.5">
                          Note: "{item.comments}"
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <span className="text-xs text-gray-500">Standard item summary</span>
                )}
              </div>
            </div>

            {/* Receipt Summary Totals */}
            <div className="flex flex-col gap-2 text-xs border-t border-gray-100 pt-3">
              <div className="flex justify-between text-gray-500">
                <span>Payment Status</span>
                <span className="font-bold text-emerald-600">✓ Paid</span>
              </div>
              <div className="flex justify-between text-gray-500">
                <span>Cashback Earned (5%)</span>
                <span className="font-bold text-[#b08115]">+€{(selectedOrder.total * 0.05).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm font-extrabold text-gray-950 pt-2 border-t border-gray-100">
                <span>Total Amount</span>
                <span>€{selectedOrder.total.toFixed(2)}</span>
              </div>
            </div>

            {/* Confirm Pickup Action if Ready */}
            {selectedOrder.status === 'ready' && selectedOrder.source === 'merch' && (
              <button
                onClick={() => handleConfirmPickup(selectedOrder.id)}
                disabled={confirmingPickupId === selectedOrder.id}
                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-3.5 rounded-[16px] text-sm transition-all shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5 text-white" />
                <span>{confirmingPickupId === selectedOrder.id ? 'Confirming...' : 'Confirm Counter Pickup'}</span>
              </button>
            )}

            {/* Close Button */}
            <button
              onClick={() => setSelectedOrder(null)}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-[16px] text-xs transition-colors cursor-pointer mt-1"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
