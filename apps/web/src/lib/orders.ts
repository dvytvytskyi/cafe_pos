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
  status: 'incoming' | 'new' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
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
  const stored = localStorage.getItem('corgi_orders');
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
      id: 'ORD-002',
      source: 'takeaway',
      customerName: 'Maria Garcia',
      customerId: 'g-2',
      items: [
        { name: 'Flat White', quantity: 1, price: 3.8 },
        { name: 'Salmon Bagel', quantity: 1, price: 9.5 }
      ],
      total: 13.3,
      status: 'completed',
      time: new Date(Date.now() - 12 * 3600000),
      paid: true,
      orderedBy: 'waiter'
    },
    {
      id: 'ORD-003',
      source: 'dine_in',
      customerName: 'John Doe',
      customerId: 'g-3',
      items: [
        { name: 'Espresso', quantity: 1, price: 3.0 },
        { name: 'Egg Benedict', quantity: 1, price: 12.0 }
      ],
      total: 15.0,
      status: 'completed',
      time: new Date(Date.now() - 36 * 3600000),
      paid: true,
      orderedBy: 'waiter'
    },
    {
      id: 'ORD-004',
      source: 'dine_in',
      customerName: 'Oleksandr Kovalenko',
      customerId: 'g-1',
      items: [
        { name: 'Cappuccino', quantity: 1, price: 4.0 },
        { name: 'Croissant', quantity: 2, price: 2.5 }
      ],
      total: 9.0,
      status: 'completed',
      time: new Date(Date.now() - 2 * 3600000),
      paid: true,
      orderedBy: 'waiter'
    }
  ];
  
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_orders', JSON.stringify(seed));
  }
  return seed;
};

export const saveOrders = (orders: Order[]) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem('corgi_orders', JSON.stringify(orders));
  }
};
