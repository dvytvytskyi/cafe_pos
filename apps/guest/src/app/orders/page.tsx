'use client';

import React, { useEffect, useState } from 'react';
import { useGuest } from '@/lib/guest-context';
import { getOrders, getOrder } from '@/lib/api-client';
import type { GuestOrderSummary } from '@corgi/contracts';

export default function OrdersPage() {
  const { isLoggedIn } = useGuest();
  const [orders, setOrders] = useState<GuestOrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<GuestOrderSummary | null>(null);

  useEffect(() => {
    if (isLoggedIn) {
      getOrders()
        .then((res) => setOrders(res.orders))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [isLoggedIn]);

  const handleSelectOrder = async (id: string) => {
    try {
      const details = await getOrder(id);
      setSelectedOrder(details);
    } catch (err: any) {
      alert(`Could not load order details: ${err.message}`);
    }
  };

  const handleConfirmPickup = async (orderId: string) => {
    try {
      const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      const res = await fetch(`${API_BASE}/api/guest/orders/${orderId}/confirm-merch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to confirm pickup');
      alert('Pickup confirmed successfully!');
      // Refresh list
      const updated = await getOrders();
      setOrders(updated.orders);
      if (selectedOrder?.id === orderId) {
        setSelectedOrder(null);
      }
    } catch (err: any) {
      alert(`Pickup confirm failed: ${err.message}`);
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ padding: '20px' }}>
        <h1>My Orders</h1>
        <p>Please log in on the Loyalty tab to check your orders.</p>
      </div>
    );
  }

  if (loading) return <div style={{ padding: '20px' }}>Loading orders...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>My Orders ({orders.length})</h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {orders.map((o) => (
          <div key={o.id} style={{ border: '1px solid #eee', padding: '10px' }}>
            <h3>Order #{o.orderNumber}</h3>
            <p>Source: {o.source}</p>
            <p>Status: <strong>{o.status}</strong></p>
            <p>Total: {o.total.toFixed(2)}€</p>
            <button onClick={() => handleSelectOrder(o.id)}>View Details</button>
            {o.status === 'ready' && o.source === 'merch' && (
              <button onClick={() => handleConfirmPickup(o.id)} style={{ marginLeft: '10px', background: 'lightgreen' }}>
                Confirm Pickup
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedOrder && (
        <div style={{ position: 'fixed', top: '10%', left: '10%', right: '10%', bottom: '10%', background: '#fff', border: '2px solid #000', padding: '20px', zIndex: 100, overflowY: 'auto' }}>
          <h2>Order Details #{selectedOrder.orderNumber}</h2>
          <p>Status: {selectedOrder.status}</p>
          <p>Paid: {selectedOrder.paid ? 'Yes' : 'No'}</p>
          <p>Total: {selectedOrder.total.toFixed(2)}€</p>
          <p>Tip: {selectedOrder.tipValue} ({selectedOrder.tipType || 'none'})</p>

          <h3>Items:</h3>
          <ul>
            {selectedOrder.items?.map((item: any, idx: number) => (
              <li key={idx}>
                {item.name} x {item.quantity} - {(item.price * item.quantity).toFixed(2)}€
                {item.comments && <p style={{ fontStyle: 'italic', margin: 0 }}>Comment: {item.comments}</p>}
              </li>
            ))}
          </ul>

          <button onClick={() => setSelectedOrder(null)} style={{ marginTop: '20px' }}>Close</button>
        </div>
      )}
    </div>
  );
}
