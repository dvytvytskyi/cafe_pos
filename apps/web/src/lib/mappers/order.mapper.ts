import { calculateDiscountAmount } from './order-totals';

export type UiOrderSource = 'glovo' | 'ubereats' | 'dine_in' | 'takeaway';
export type UiOrderStatus = 'incoming' | 'preparing' | 'ready' | 'served' | 'completed' | 'cancelled';

export interface UiOrderItem {
  id?: string;
  name: string;
  price: number;
  quantity: number;
  paid?: boolean;
  comments?: string;
  refundedQuantity?: number;
  menuItemId?: string;
  modifierSnapshot?: unknown;
  guestIndex?: number;
  sentToKitchen?: boolean;
  sentToBar?: boolean;
  served?: boolean;
}

export interface UiOrder {
  id: string;
  source: UiOrderSource;
  customerName: string;
  items: UiOrderItem[];
  total: number;
  discount?: { name: string; value: number; type?: 'percent' | 'fixed'; amountDeducted: number };
  tip?: { type: 'percent' | 'fixed'; value: number; amountAdded: number };
  status: UiOrderStatus;
  time: Date;
  paid: boolean;
  amountPaid?: number;
  refundedAmount?: number;
  payments?: { method: 'card' | 'cash' | 'points' | 'giftcard'; amount: number; code?: string }[];
  orderedBy: 'waiter' | 'app';
  customerId?: string;
  loyaltyGuestIds?: string[];
  tableId?: string;
  orderNumber?: string;
  tableNumber?: string | null;
  waiterName?: string | null;
  updatedAt?: Date;
  customerPointsEarned?: number;
  guestCount?: number;
  takenByStaffId?: string;
  servedByStaffId?: string;
  closedByStaffId?: string;
  assignedStaffId?: string;
  isPrepaid?: boolean;
  pointsToSpend?: number;
  receiptsSentTo?: string[];
  customerEmail?: string;
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
  loyaltyGuestIds?: string[];
  orderNumber?: string;
  tableNumber?: string | null;
  waiterName?: string | null;
  discountName?: string;
  discountValue?: number;
  discountType?: 'percent' | 'fixed';
  tipType?: string;
  tipValue?: number;
  updatedAt?: string | Date;
  warnings?: string[];
  customerPointsEarned?: number;
  guestCount?: number;
  takenByStaffId?: string;
  servedByStaffId?: string;
  closedByStaffId?: string;
  assignedStaffId?: string;
  isPrepaid?: boolean;
  pointsToSpend?: number;
  receiptsSentTo?: string[];
  invoiceEmail?: string;
}

export function mapApiOrderToUi(api: ApiOrder): UiOrder {
  const paid = api.paymentStatus === 'paid' || api.paid === true;
  const discountValue = api.discountValue ?? 0;
  const itemsSubtotal = (api.items || []).reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const rawSubtotal = itemsSubtotal > 0 ? itemsSubtotal : api.total;
  const discountType = (api.discountType as 'percent' | 'fixed' | undefined) ?? 'percent';
  const amountDeducted =
    api.discountName && discountValue > 0
      ? calculateDiscountAmount(rawSubtotal, {
          name: api.discountName,
          value: discountValue,
          type: discountType,
        })
      : 0;
  const afterDiscount = parseFloat(Math.max(0, rawSubtotal - amountDeducted).toFixed(2));
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
    loyaltyGuestIds:
      api.loyaltyGuestIds && api.loyaltyGuestIds.length > 0
        ? api.loyaltyGuestIds
        : api.customerId
          ? [api.customerId]
          : [],
    tableId: api.tableId,
    orderNumber: api.orderNumber,
    tableNumber: api.tableNumber ?? null,
    waiterName: api.waiterName ?? null,
    items: (api.items || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      comments: item.comments,
      paid: item.paid,
      refundedQuantity: item.refundedQuantity ?? 0,
      menuItemId: item.menuItemId,
      modifierSnapshot: item.modifierSnapshot,
      guestIndex: item.guestIndex,
      sentToKitchen: item.sentToKitchen,
      sentToBar: item.sentToBar,
      served: item.served,
    })),
    total: api.total,
    refundedAmount: api.refundedAmount ?? 0,
    discount:
      api.discountName && discountValue > 0
        ? {
            name: api.discountName,
            value: discountValue,
            type: discountType,
            amountDeducted,
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
    updatedAt: api.updatedAt ? new Date(api.updatedAt) : undefined,
    paid,
    amountPaid: api.amountPaid ?? (paid ? api.total : 0),
    payments: (api.transactions || []).map((t) => ({
      method: t.method as 'card' | 'cash' | 'points' | 'giftcard',
      amount: t.amount,
      code: t.code || undefined,
    })),
    orderedBy: api.source === 'dine_in' || api.source === 'takeaway' ? 'waiter' : 'app',
    customerPointsEarned: api.customerPointsEarned,
    guestCount: api.guestCount,
    takenByStaffId: api.takenByStaffId,
    servedByStaffId: api.servedByStaffId,
    closedByStaffId: api.closedByStaffId,
    assignedStaffId: api.assignedStaffId,
    isPrepaid: api.isPrepaid,
    pointsToSpend: api.pointsToSpend,
    receiptsSentTo: api.receiptsSentTo,
    customerEmail: api.invoiceEmail,
  };
}

export function mapUiOrderToApi(
  ui: Partial<UiOrder> & {
    locationId?: string;
    tableId?: string;
    items?: UiOrderItem[];
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
  };

  if (ui.items && ui.items.length > 0) {
    payload.items = ui.items.map((item) => ({
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      comments: item.comments,
    }));
  }

  if (ui.id) payload.id = ui.id;
  if (ui.discount?.name) {
    payload.discountName = ui.discount.name;
    payload.discountValue = ui.discount.value;
    payload.discountType = ui.discount.type ?? 'percent';
  } else if ('discount' in ui && ui.discount === undefined) {
    payload.discountName = null;
    payload.discountValue = 0;
  }
  if (ui.tip?.type) {
    payload.tipType = ui.tip.type;
    payload.tipValue = ui.tip.value;
  } else if ('tip' in ui && ui.tip === undefined) {
    payload.tipType = null;
    payload.tipValue = 0;
  }
  if ('customerId' in ui) payload.customerId = ui.customerId ?? null;
  if (ui.loyaltyGuestIds !== undefined) payload.loyaltyGuestIds = ui.loyaltyGuestIds;

  return payload;
}
