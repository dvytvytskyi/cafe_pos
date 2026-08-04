import { mapApiOrderToUi, mapUiOrderToApi } from './mappers/order.mapper';
import { DEFAULT_LOCATION_ID } from './constants';

export type OrderSource = 'glovo' | 'ubereats' | 'dine_in' | 'takeaway';

export interface OrderItem {
  name: string;
  price: number;
  quantity: number;
  paid?: boolean;
  comments?: string; // Phase 2: Kitchen comments
}

export interface Order {
  id: string;
  source: OrderSource;
  customerName: string;
  items: OrderItem[];
  total: number; // Final total including discounts and tips
  discount?: { name: string; value: number; amountDeducted: number };
  tip?: { type: 'percent' | 'fixed'; value: number; amountAdded: number };
  status: 'incoming' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
  time: Date;
  deliveryId?: string;
  paid: boolean;
  amountPaid?: number;
  payments?: { method: 'card' | 'cash' | 'points' | 'giftcard'; amount: number; code?: string }[];
  orderedBy: 'waiter' | 'app';
  readyByTime?: string;
  customerEmail?: string;
  receiptsSentTo?: string[];
  customerId?: string;
  customerPointsPaid?: number;
  customerPointsEarned?: number;
  tableId?: string; // Phase 1: Linked table id
}

export const getOrders = (): Order[] => {
  if (typeof window === 'undefined') return [];
  const stored = localStorage.getItem('corgi_orders_v2');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      return parsed.map((o: any) => ({
        ...o,
        time: new Date(o.time)
      }));
    } catch (e) {
      console.error("Failed to parse orders", e);
    }
  }
  // Seed orders if empty in localStorage
  const seed: Order[] = [
    {
      id: 'ORD-001',
      source: 'dine_in',
      customerName: 'Oleksandr Kovalenko',
      customerId: 'g-1',
      items: [
        { name: 'Corgi Latte', quantity: 2, price: 4.5 },
        { name: 'Avocado Toast', quantity: 1, price: 8.0 }
      ],
      total: 17.0,
      status: 'completed',
      time: new Date(Date.now() - 24 * 3600000),
      paid: true,
      orderedBy: 'waiter'
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
      status: 'incoming',
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
        { name: 'Eggs Benedict', quantity: 2, price: 12.0 }
      ],
      total: 52.5,
      status: 'preparing',
      time: new Date(Date.now() - 12 * 60000),
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
      paid: true,
      orderedBy: 'app',
      deliveryId: 'U-9925C',
    }
  ];
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_orders_v2', JSON.stringify(seed));
  }
  return seed;
};

export const saveOrders = (orders: Order[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_orders_v2', JSON.stringify(orders));
  }
};

export async function getOrdersAsync(locationId: string = DEFAULT_LOCATION_ID): Promise<Order[]> {
  const res = await fetch(`/api/orders?locationId=${locationId}`);
  if (!res.ok) {
    throw new Error('Failed to fetch active orders from PostgreSQL');
  }
  const data = await res.json();
  return data.map((o) => mapApiOrderToUi(o) as Order);
}

export async function createOrderAsync(
  order: Partial<Order> & { items: OrderItem[]; tableId?: string; locationId?: string }
): Promise<Order> {
  const payload = mapUiOrderToApi({
    ...order,
    locationId: order.locationId || DEFAULT_LOCATION_ID,
    source: order.source || 'dine_in',
    status: order.status || 'preparing',
    items: order.items,
  });

  const res = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.details || 'Failed to create order in PostgreSQL');
  }
  return mapApiOrderToUi(await res.json()) as Order;
}

export async function updateOrderAsync(id: string, order: Partial<Order> & { items?: OrderItem[] }): Promise<Order> {
  const payload = order.items
    ? mapUiOrderToApi({
        ...order,
        items: order.items,
        locationId: DEFAULT_LOCATION_ID,
      })
    : order;

  const res = await fetch(`/api/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.details || `Failed to update order [${id}] in PostgreSQL`);
  }
  return mapApiOrderToUi(await res.json()) as Order;
}

/** @deprecated Use createOrderAsync */
export async function saveOrderAsync(order: Partial<Order>): Promise<Order> {
  return createOrderAsync(order as Partial<Order> & { items: OrderItem[] });
}

export async function updateOrderStatusAsync(id: string, status: string): Promise<Order> {
  const res = await fetch(`/api/orders/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    throw new Error(`Failed to update order status for [${id}] in PostgreSQL`);
  }
  return mapApiOrderToUi(await res.json()) as Order;
}

