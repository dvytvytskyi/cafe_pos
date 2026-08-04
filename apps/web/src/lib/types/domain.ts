export type OrderStatus = 'incoming' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';
export type PaymentStatus = 'unpaid' | 'paid' | 'refunded';

export interface OrderItem {
  id: string;
  productId: string;
  name: string;
  quantity: number;
  price: number;
  modifiers: { id: string; name: string; price: number }[];
  notes?: string;
  paid?: boolean;
  comments?: string;
}

export interface Order {
  id: string;
  tableId?: string;
  locationId: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  createdAt: Date;
  updatedAt: Date;
  customerName?: string;
  customerId?: string;
  orderedBy?: string;
  source?: string;
  deliveryId?: string;
  paid?: boolean;
}
