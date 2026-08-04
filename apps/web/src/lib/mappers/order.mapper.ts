export type UiOrderSource = 'glovo' | 'ubereats' | 'dine_in' | 'takeaway';
export type UiOrderStatus = 'incoming' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface UiOrderItem {
  name: string;
  price: number;
  quantity: number;
  paid?: boolean;
  comments?: string;
}

export interface UiOrder {
  id: string;
  source: UiOrderSource;
  customerName: string;
  items: UiOrderItem[];
  total: number;
  discount?: { name: string; value: number; amountDeducted: number };
  status: UiOrderStatus;
  time: Date;
  paid: boolean;
  orderedBy: 'waiter' | 'app';
  customerId?: string;
  tableId?: string;
}

export interface ApiOrder {
  id: string;
  tableId?: string;
  locationId?: string;
  status: string;
  paymentStatus?: 'paid' | 'unpaid';
  paid?: boolean;
  source?: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    comments?: string;
    paid?: boolean;
  }>;
  total: number;
  createdAt?: string | Date;
  time?: string | Date;
  customerName?: string;
  customerId?: string;
  discountName?: string;
  discountValue?: number;
}

export function mapApiOrderToUi(api: ApiOrder): UiOrder {
  const paid = api.paymentStatus === 'paid' || api.paid === true;
  const discountValue = api.discountValue ?? 0;
  const subtotal = api.total / (discountValue > 0 ? 1 - discountValue / 100 : 1);

  return {
    id: api.id,
    source: (api.source || 'dine_in') as UiOrderSource,
    customerName: api.customerName || 'Walk-in',
    customerId: api.customerId,
    tableId: api.tableId,
    items: (api.items || []).map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      comments: item.comments,
      paid: item.paid,
    })),
    total: api.total,
    discount:
      api.discountName && discountValue > 0
        ? {
            name: api.discountName,
            value: discountValue,
            amountDeducted: parseFloat((subtotal - api.total).toFixed(2)),
          }
        : undefined,
    status: api.status as UiOrderStatus,
    time: new Date(api.createdAt || api.time || Date.now()),
    paid,
    orderedBy: api.source === 'dine_in' || api.source === 'takeaway' ? 'waiter' : 'app',
  };
}

export function mapUiOrderToApi(
  ui: Partial<UiOrder> & {
    locationId?: string;
    tableId?: string;
    items: UiOrderItem[];
  }
): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    locationId: ui.locationId || 'default',
    source: ui.source || 'dine_in',
    status: ui.status || 'preparing',
    paymentStatus: ui.paid ? 'paid' : 'unpaid',
    total: ui.total ?? 0,
    customerName: ui.customerName,
    customerId: ui.customerId,
    tableId: ui.tableId,
    items: ui.items.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      comments: item.comments,
    })),
  };

  if (ui.id) payload.id = ui.id;
  if (ui.discount?.name) payload.discountName = ui.discount.name;
  if (ui.discount?.value !== undefined) payload.discountValue = ui.discount.value;

  return payload;
}
