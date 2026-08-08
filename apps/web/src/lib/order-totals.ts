export interface OrderLineItem {
  price: number;
  quantity: number;
  comments?: string;
}

export interface OrderTotals {
  subtotal: number;
  discountAmount: number;
  tax: number;
  total: number;
}

export const DEFAULT_FOOD_TAX_RATE = 0.1;

export function calculateOrderTotals(
  items: OrderLineItem[],
  options: { taxRate?: number; discountPercent?: number } = {},
): OrderTotals {
  const taxRate = options.taxRate ?? DEFAULT_FOOD_TAX_RATE;
  const discountPercent = options.discountPercent ?? 0;

  const subtotal = parseFloat(
    items.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2),
  );
  const discountAmount = parseFloat((subtotal * discountPercent).toFixed(2));
  const taxableBase = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));
  const tax = parseFloat((taxableBase * taxRate).toFixed(2));
  const total = parseFloat((taxableBase + tax).toFixed(2));

  return { subtotal, discountAmount, tax, total };
}
