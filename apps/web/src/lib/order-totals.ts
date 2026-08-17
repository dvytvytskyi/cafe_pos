import type { OrderLineItem } from './order-totals';

export const DEFAULT_FOOD_TAX_RATE = 0.10;

export type DiscountType = 'percent' | 'fixed';
export type TipType = 'percent' | 'fixed';

export interface DiscountInput {
  name: string;
  value: number;
  type?: DiscountType;
}

export interface TipInput {
  type: TipType;
  value: number;
}

export interface OrderPricingOptions {
  taxRate?: number;
  discount?: DiscountInput | null;
  tip?: TipInput | null;
}

export interface OrderPricing {
  subtotal: number;
  discountAmount: number;
  afterDiscount: number;
  tipAmount: number;
  tax: number;
  total: number;
}

export function calculateDiscountAmount(
  subtotal: number,
  discount?: DiscountInput | null,
): number {
  if (!discount || discount.value <= 0) return 0;
  const type = discount.type ?? 'percent';
  if (type === 'fixed') {
    return parseFloat(Math.min(subtotal, discount.value).toFixed(2));
  }
  return parseFloat((subtotal * (discount.value / 100)).toFixed(2));
}

export function calculateTipAmount(afterDiscount: number, tip?: TipInput | null): number {
  if (!tip || tip.value <= 0) return 0;
  if (tip.type === 'fixed') return parseFloat(tip.value.toFixed(2));
  return parseFloat((afterDiscount * (tip.value / 100)).toFixed(2));
}

export function calculateOrderPricing(
  items: OrderLineItem[],
  options: OrderPricingOptions = {},
): OrderPricing {
  const taxRate = options.taxRate ?? 0.1;
  const subtotal = parseFloat(
    items.reduce((acc, item) => acc + item.price * item.quantity, 0).toFixed(2),
  );
  const discountAmount = calculateDiscountAmount(subtotal, options.discount);
  const afterDiscount = parseFloat(Math.max(0, subtotal - discountAmount).toFixed(2));
  const tipAmount = calculateTipAmount(afterDiscount, options.tip);
  const taxableBase = parseFloat((afterDiscount + tipAmount).toFixed(2));
  const tax = parseFloat((taxableBase * taxRate).toFixed(2));
  const total = parseFloat((taxableBase + tax).toFixed(2));

  return { subtotal, discountAmount, afterDiscount, tipAmount, tax, total };
}

/** @deprecated Use calculateOrderPricing */
export function calculateOrderTotals(
  items: OrderLineItem[],
  options: { taxRate?: number; discountPercent?: number } = {},
) {
  const pricing = calculateOrderPricing(items, {
    taxRate: options.taxRate,
    discount:
      options.discountPercent && options.discountPercent > 0
        ? { name: 'Discount', value: options.discountPercent, type: 'percent' }
        : null,
  });
  return {
    subtotal: pricing.subtotal,
    discountAmount: pricing.discountAmount,
    tax: pricing.tax,
    total: pricing.total,
  };
}

export function calculateCashChange(amountDue: number, cashTendered: number) {
  const change = parseFloat(Math.max(0, cashTendered - amountDue).toFixed(2));
  return { amountDue, cashTendered, changeGiven: change };
}

export function isDeliverySource(source: string): boolean {
  return source === 'glovo' || source === 'ubereats';
}

export function isPrepaidDeliveryOrder(source: string, isPrepaid?: boolean): boolean {
  return isPrepaid === true || isDeliverySource(source);
}
