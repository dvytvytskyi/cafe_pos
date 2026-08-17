'use client';

import React, { useEffect, useState } from 'react';
import { useGuest } from '@/lib/guest-context';
import { getMerchCatalog, createMerchOrder } from '@/lib/api-client';
import type { GuestMerchItem } from '@corgi/contracts';

export default function ShopPage() {
  const { bootstrap, merchCart, addMerchToCart, updateMerchQty, clearMerchCart } = useGuest();
  const [items, setItems] = useState<GuestMerchItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (bootstrap?.location?.id) {
      getMerchCatalog(bootstrap.location.id)
        .then((res) => setItems(res.items))
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [bootstrap]);

  const handleAddToCart = (item: GuestMerchItem) => {
    addMerchToCart({
      merchSkuId: item.sku,
      itemType: 'merch',
      name: item.name,
      unitPrice: item.price,
      quantity: 1,
    });
  };

  const handleCheckout = async () => {
    if (!bootstrap?.location?.id || merchCart.length === 0) return;
    try {
      const order = await createMerchOrder({
        locationId: bootstrap.location.id,
        items: merchCart,
      });
      alert(`Merch Order ORD-${order.orderNumber} created! Pick up at counter.`);
      clearMerchCart();
    } catch (err: any) {
      alert(`Merch order failed: ${err.message}`);
    }
  };

  if (loading) return <div style={{ padding: '20px' }}>Loading Shop...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Merch Shop</h1>

      {/* Cart Summary */}
      <div style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '20px' }}>
        <h2>Merch Cart ({merchCart.length} items)</h2>
        {merchCart.map((item) => (
          <div key={item.key} style={{ margin: '5px 0' }}>
            <span>{item.name} x {item.quantity} - {((item.unitPrice * item.quantity)).toFixed(2)}€</span>
            <button onClick={() => updateMerchQty(item.key, 1)} style={{ marginLeft: '10px' }}>+</button>
            <button onClick={() => updateMerchQty(item.key, -1)}>-</button>
          </div>
        ))}
        {merchCart.length > 0 && (
          <button onClick={handleCheckout} style={{ marginTop: '10px' }}>Order for Pickup</button>
        )}
      </div>

      {/* Catalog items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {items.map((item) => (
          <div key={item.sku} style={{ border: '1px solid #eee', padding: '10px' }}>
            <h3>{item.name}</h3>
            {item.guestDescription && <p>{item.guestDescription}</p>}
            <p>SKU: {item.sku}</p>
            <span>{item.price.toFixed(2)}€</span>
            <button onClick={() => handleAddToCart(item)} style={{ display: 'block', marginTop: '5px' }}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
