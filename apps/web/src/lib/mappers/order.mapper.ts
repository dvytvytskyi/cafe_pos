export type UiOrderSource = 'glovo' | 'ubereats' | 'dine_in' | 'takeaway';
export type UiOrderStatus = 'incoming' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface UiOrderItem {
  name: string;
  price: number;
  quantity: number;
  paid?: boolean;
  comments?: string;
  refundedQuantity?: number;
}

export interface UiOrder {
  id: string;
  source: UiOrderSource;
  customerName: string;
  items: UiOrderItem[];
  total: number;
  discount?: { name: string; value: number; amountDeducted: number };
  tip?: { type: 'percent' | 'fixed'; value: number; amountAdded: number };
  status: UiOrderStatus;
  time: Date;
  paid: boolean;
  amountPaid?: number;
  refundedAmount?: number;
  payments?: { method: 'card' | 'cash' | 'points' | 'giftcard'; amount: number; code?: string }[];
  orderedBy: 'waiter' | 'app';
  customerId?: string;
  tableId?: string;
  orderNumber?: string;
  tableNumber?: string | null;
  waiterName?: string | null;
}

export interface ApiOrder {
  id: string;
  tableId?: string;
  locationId?: string;
  status: string;
  paymentStatus?: 'paid' | 'unpaid';
  paid?: boolean;
  amountPaid?: number;
  source?: string;
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    comments?: string;
    paid?: boolean;
    refundedQuantity?: number;
  }>;
  refundedAmount?: number;
  transactions?: Array<{
    method: string;
    amount: number;
    code?: string | null;
  }>;
  total: number;
  createdAt?: string | Date;
  time?: string | Date;
  customerName?: string;
  customerId?: string;
  orderNumber?: string;
  tableNumber?: string | null;
  waiterName?: string | null;
  discountName?: string;
  discountValue?: number;
  tipType?: string;
  tipValue?: number;
  warnings?: string[];
}

export function mapApiOrderToUi(api: ApiOrder): UiOrder {
  const paid = api.paymentStatus === 'paid' || api.paid === true;
  const discountValue = api.discountValue ?? 0;
  const subtotal = api.total / (discountValue > 0 ? 1 - discountValue / 100 : 1);
  const afterDiscount = discountValue > 0 ? subtotal - (subtotal - api.total) : api.total;
  const tipValue = api.tipValue ?? 0;
  let tipAmountAdded = 0;
  if (api.tipType && tipValue > 0) {
    tipAmountAdded =
      api.tipType === 'percent'
        ? parseFloat((afterDiscount * (tipValue / 100)).toFixed(2))
        : tipValue;
  }

  return {
    id: api.id,
    source: (api.source || 'dine_in') as UiOrderSource,
    customerName: api.customerName || 'Walk-in',
    customerId: api.customerId,
    tableId: api.tableId,
    orderNumber: api.orderNumber,
    tableNumber: api.tableNumber ?? null,
    waiterName: api.waiterName ?? null,
    items: (api.items || []).map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      comments: item.comments,
      paid: item.paid,
      refundedQuantity: item.refundedQuantity ?? 0,
    })),
    total: api.total,
    refundedAmount: api.refundedAmount ?? 0,
    discount:
      api.discountName && discountValue > 0
        ? {
            name: api.discountName,
            value: discountValue,
            amountDeducted: parseFloat((subtotal - afterDiscount).toFixed(2)),
          }
        : undefined,
    tip:
      api.tipType && tipValue > 0
        ? {
            type: api.tipType as 'percent' | 'fixed',
            value: tipValue,
            amountAdded: tipAmountAdded,
          }
        : undefined,
    status: api.status as UiOrderStatus,
    time: new Date(api.createdAt || api.time || Date.now()),
    paid,
    amountPaid: api.amountPaid ?? (paid ? api.total : 0),
    payments: (api.transactions || []).map((t) => ({
      method: t.method as 'card' | 'cash' | 'points' | 'giftcard',
      amount: t.amount,
      code: t.code || undefined,
    })),
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
  if (ui.tip?.type) payload.tipType = ui.tip.type;
  if (ui.tip?.value !== undefined) payload.tipValue = ui.tip.value;

  return payload;
}
