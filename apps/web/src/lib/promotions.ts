import { OrderItem } from './orders';

export interface Promotion {
  id: string;
  name: string;
  discountPercent: number;
  activeDays: number[]; // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
  startHour: number; // 24h format
  endHour: number; // 24h format
  targetItems?: string[]; // item names affected
}

export const PRESET_PROMOTIONS: Promotion[] = [
  {
    id: 'promo-1',
    name: 'Happy Hour Friday',
    discountPercent: 20,
    activeDays: [5], // Friday
    startHour: 18,
    endHour: 20,
    targetItems: ['Espresso', 'Corgi Latte', 'Flat White', 'Cappuccino', 'Filter Coffee', 'Iced Latte', 'Mocha', 'Latte Macchiato', 'English Breakfast Tea', 'Fresh Orange Juice', 'Orange Juice']
  },
  {
    id: 'promo-2',
    name: 'Brunch Special Sunday',
    discountPercent: 15,
    activeDays: [0], // Sunday
    startHour: 11,
    endHour: 14,
    targetItems: ['Avocado Toast', 'Eggs Benedict', 'Corgi Special Breakfast', 'Brunch Set For 2']
  }
];

export function getPromotions(): Promotion[] {
  if (typeof window === 'undefined') return PRESET_PROMOTIONS;
  const stored = localStorage.getItem('corgi_promotions');
  if (!stored) {
    localStorage.setItem('corgi_promotions', JSON.stringify(PRESET_PROMOTIONS));
    return PRESET_PROMOTIONS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return PRESET_PROMOTIONS;
  }
}

export function savePromotions(promos: Promotion[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('corgi_promotions', JSON.stringify(promos));
}

export const getActivePromotion = (dateInput?: Date): Promotion | null => {
  const date = dateInput || new Date();
  const day = date.getDay();
  const hour = date.getHours();
  const promos = getPromotions();

  for (const promo of promos) {
    if (promo.activeDays.includes(day) && hour >= promo.startHour && hour < promo.endHour) {
      return promo;
    }
  }
  return null;
};

// Calculate if there's any active promotion and apply it to eligible order items
export const calculateHappyHourDiscount = (items: OrderItem[], dateInput?: Date): {
  name: string;
  value: number; // percent
  amountDeducted: number;
} | null => {
  const activePromo = getActivePromotion(dateInput);
  if (!activePromo) return null;

  let totalDeduction = 0;
  let hasEligibleItems = false;

  items.forEach(item => {
    const isTarget = !activePromo.targetItems || activePromo.targetItems.length === 0 || activePromo.targetItems.includes(item.name);
    if (isTarget) {
      hasEligibleItems = true;
      const itemSubtotal = item.price * item.quantity;
      totalDeduction += itemSubtotal * (activePromo.discountPercent / 100);
    }
  });

  if (!hasEligibleItems) return null;

  return {
    name: activePromo.name,
    value: activePromo.discountPercent,
    amountDeducted: parseFloat(totalDeduction.toFixed(2))
  };
};

// --- Database Connected Async Operations ---

export async function getPromotionsAsync(): Promise<Promotion[]> {
  const res = await fetch('/api/promotions');
  if (!res.ok) {
    throw new Error('Failed to fetch promotions from PostgreSQL');
  }
  return res.json();
}

export async function createPromotionAsync(data: {
  name: string;
  discountPercent: number;
  activeDays: number[];
  startHour: number;
  endHour: number;
  targetItems?: string[];
}): Promise<Promotion> {
  const res = await fetch('/api/promotions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw new Error('Failed to create promotion rule in PostgreSQL');
  }
  return res.json();
}

export async function calculateHappyHourDiscountAsync(
  items: OrderItem[],
  dateInput?: Date | string
): Promise<{ name: string; value: number; amountDeduction: number } | null> {
  const res = await fetch('/api/promotions/calculate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items, date: dateInput }),
  });
  if (!res.ok) {
    throw new Error('Failed to evaluate promotion discount calculations on server');
  }
  return res.json();
}

