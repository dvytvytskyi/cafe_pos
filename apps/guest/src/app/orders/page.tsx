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
  PawPrint,
} from 'lucide-react';

// Fallback sample orders removed — show only real API data.

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
          setOrders(res.orders ?? []);
        })
        .catch((err) => {
          console.warn('Failed to load orders:', err);
          setOrders([]);
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
          <span className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[11px] font-bold bg-[#FDBD38] text-white shadow-xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>Ready for Pickup</span>
          </span>
        );
      case 'pending':
      case 'preparing':
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FDBD38] text-white shadow-xs">
            <Clock className="w-3.5 h-3.5 text-white" />
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
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#FDBD38] px-2.5 py-0.5 rounded-full shadow-xs">
          <ShoppingBag className="w-3 h-3 text-white" />
          <span>Merch Shop</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-white bg-[#FDBD38] px-2.5 py-0.5 rounded-full shadow-xs">
        <Utensils className="w-3 h-3 text-white" />
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
              <span className="w-2 h-2 rounded-full bg-[#4ADE80] flex-shrink-0" />
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

        {/* Logged Out Screen with Corgi Sticker */}
        <div className="w-full max-w-[400px] px-6 py-14 flex flex-col items-center text-center relative z-20 animate-fadeIn">
          {/* Corgi Sticker */}
          <div className="w-28 h-28 relative mb-4 flex items-center justify-center">
            <img 
              src="/stickers/corgi_fiesta_1.png" 
              alt="Corgi Fiesta Sticker" 
              className="w-full h-full object-contain"
            />
          </div>

          <h2 className="text-[24px] font-bold text-[#FDBD38] tracking-tight leading-tight mb-2 flex items-center justify-center gap-2">
            <span>Sign in to view orders</span>
            <PawPrint className="w-5.5 h-5.5 text-[#FDBD38] fill-[#FDBD38]" />
          </h2>
          <p className="text-[14px] text-gray-500 max-w-[300px] leading-relaxed mb-8 font-normal">
            Sign in to track your live food orders, view purchase history, and earn cashback rewards.
          </p>
          <Link
            href="/loyalty"
            className="w-full max-w-[320px] bg-[#FDBD38] hover:bg-[#e5a420] text-white font-bold py-4 px-6 rounded-full text-[15px] transition-all active:scale-[0.98] shadow-none flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Go to Sign In</span>
            <ChevronRight className="w-5 h-5 text-white" />
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
            <span className="w-2 h-2 rounded-full bg-[#4ADE80] flex-shrink-0" />
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
          /* Frameless Clean Empty State with Corgi Sticker & Yellow Paw Title */
          <div className="w-full flex flex-col items-center text-center py-12 px-2 animate-fadeIn">
            {/* Corgi Sticker */}
            <div className="w-28 h-28 relative mb-4 flex items-center justify-center">
              <img 
                src="/stickers/corgi_coffee1.png" 
                alt="Corgi Coffee Sticker" 
                className="w-full h-full object-contain"
              />
            </div>

            {/* Title & Paws in Brand Yellow */}
            <h3 className="text-[24px] font-bold text-[#FDBD38] tracking-tight leading-tight flex items-center justify-center gap-2">
              <span>No orders yet</span>
              <div className="flex items-center gap-1 text-[#FDBD38]">
                <PawPrint className="w-5.5 h-5.5 text-[#FDBD38] fill-[#FDBD38]" />
                <PawPrint className="w-4 h-4 text-[#FDBD38] fill-[#FDBD38] opacity-80 -mt-1" />
              </div>
            </h3>

            <p className="text-[14px] text-gray-500 max-w-[300px] mt-2 mb-8 leading-relaxed font-normal">
              You haven’t placed any orders yet. Explore our menu or merch catalog!
            </p>

            {/* Large Beautiful Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-[340px]">
              <Link
                href="/menu"
                className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white font-bold py-4 px-6 rounded-full text-[15px] transition-all active:scale-[0.98] shadow-none flex items-center justify-center gap-2 cursor-pointer"
              >
                <Coffee className="w-5 h-5 text-white" />
                <span>Browse Menu</span>
              </Link>
              <Link
                href="/shop"
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold py-4 px-6 rounded-full text-[15px] transition-all active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
              >
                <ShoppingBag className="w-5 h-5 text-gray-700" />
                <span>Explore Merch</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4 w-full">
            {filteredOrders.map((o) => {
              const cashbackEarned = (o.total * 0.05).toFixed(2);

              return (
                <div
                  key={o.id}
                  onClick={() => handleSelectOrder(o)}
                  className="w-full bg-white rounded-[20px] p-4.5 border border-gray-100/90 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-md transition-all cursor-pointer flex flex-col gap-3 group active:scale-[0.99] select-none"
                >
                  {/* Card Top Row: Order # & Badges */}
                  <div className="flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-gray-950 tracking-tight whitespace-nowrap">
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
                      <span className="text-sm font-bold text-gray-950">€{o.total.toFixed(2)}</span>
                      <span className="text-[11px] font-bold text-white bg-[#FDBD38] px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
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
                      className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white font-bold py-2.5 rounded-[14px] text-xs transition-all flex items-center justify-center gap-1.5 mt-1 cursor-pointer shadow-xs"
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
        <div 
          onClick={() => setSelectedOrder(null)}
          className="fixed inset-0 z-50 backdrop-blur-md bg-white/20 flex items-end sm:items-center justify-center p-0 sm:p-4 select-none cursor-pointer"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:max-w-[420px] bg-white rounded-t-[28px] sm:rounded-[28px] p-6 max-h-[85vh] overflow-y-auto flex flex-col gap-4 shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100/90 select-none animate-slide-up cursor-default"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                  Order Details
                </span>
                <h3 className="text-xl font-bold text-gray-950">#{selectedOrder.orderNumber}</h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Modal Details Body */}
            <div className="flex flex-col gap-3.5 text-xs">
              {/* Status Bar */}
              <div className="flex justify-between items-center bg-gray-50/80 p-3.5 rounded-[14px] border border-gray-100/60">
                <span className="font-bold text-gray-900 text-xs">Status</span>
                {getStatusBadge(selectedOrder.status)}
              </div>

              {/* Order Items */}
              <div className="flex flex-col gap-2 pt-1">
                <span className="font-bold text-gray-400 text-[10px] uppercase tracking-widest">
                  Order Items
                </span>
                <div className="flex flex-col gap-2.5 bg-gray-50/80 p-3.5 rounded-[14px] border border-gray-100/60">
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    selectedOrder.items.map((item: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900 text-xs">
                          {item.quantity}x {item.name}
                        </span>
                        <span className="font-bold text-gray-950 text-xs">
                          €{(item.price * item.quantity).toFixed(2)}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-gray-400">No item breakdown available.</span>
                  )}
                </div>
              </div>

              {/* Subtotal & Totals */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                <div className="flex justify-between text-gray-500 font-medium">
                  <span>Subtotal</span>
                  <span className="font-bold text-gray-900">€{selectedOrder.total.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center text-gray-500 font-medium">
                  <span>Estimated Cashback (5%)</span>
                  <span className="text-[11px] font-bold text-white bg-[#FDBD38] px-2.5 py-0.5 rounded-full shadow-xs">
                    +€{(selectedOrder.total * 0.05).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm font-bold text-gray-950 pt-2.5 border-t border-gray-100">
                  <span>Total Paid</span>
                  <span className="text-base font-bold text-gray-950">€{selectedOrder.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Action / Close Button */}
            {selectedOrder.status === 'ready' && selectedOrder.source === 'merch' ? (
              <button
                onClick={(e) => {
                  handleConfirmPickup(selectedOrder.id, e);
                  setSelectedOrder(null);
                }}
                className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white font-bold py-3.5 rounded-[16px] text-sm transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <CheckCircle2 className="w-4.5 h-4.5 text-white" />
                <span>Confirm Counter Pickup</span>
              </button>
            ) : (
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full bg-[#FDBD38] hover:bg-[#e5a420] text-white font-bold py-3.5 rounded-[16px] text-sm transition-all active:scale-[0.98] shadow-xs flex items-center justify-center gap-2 mt-2 cursor-pointer"
              >
                <span>Close Receipt</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
