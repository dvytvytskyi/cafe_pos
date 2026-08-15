import type { CustomerSortField, SortOrder } from './crm-validation';

export class CrmApiError extends Error {
  code?: string;
  status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'CrmApiError';
    this.code = code;
    this.status = status;
  }
}

async function parseCrmError(res: Response): Promise<CrmApiError> {
  const body = await res.json().catch(() => ({}));
  const message = typeof body.error === 'string' ? body.error : 'CRM request failed';
  const code = typeof body.code === 'string' ? body.code : undefined;
  return new CrmApiError(message, code, res.status);
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
  tier: 'Bronze' | 'Silver' | 'Gold' | 'VIP';
  points: number; // 1 point = €1
  ltv: number; // Lifetime Value in €
  visitCount: number;
  lastVisitDate: string;
  favoriteDishes: string[];
  allergyNotes?: string;
  notes?: string;
  joinedDate: string;
}

/** Display loyalty points as whole numbers (no decimals). */
export function formatLoyaltyPoints(points: number): string {
  return Math.round(points).toLocaleString();
}

/** Signed points delta for logs, e.g. +10 or -5 */
export function formatLoyaltyPointsDelta(delta: number): string {
  const rounded = Math.round(delta);
  return `${rounded > 0 ? '+' : ''}${rounded}`;
}

export const DEFAULT_GUESTS: Guest[] = [
  {
    id: 'g-1',
    name: 'Oleksandr Kovalenko',
    phone: '+34 612 345 678',
    email: 'oleksandr.k@gmail.com',
    birthday: '1990-05-14',
    tier: 'VIP',
    points: 45.50,
    ltv: 350.20,
    visitCount: 24,
    lastVisitDate: '2026-07-10',
    favoriteDishes: ['Cappuccino', 'Avocado Toast', 'Croissant'],
    allergyNotes: 'Nuts (Peanuts)',
    notes: 'Regular guest, prefers oat milk in coffee.',
    joinedDate: '2025-09-01'
  },
  {
    id: 'g-2',
    name: 'Maria Garcia',
    phone: '+34 622 987 654',
    email: 'mgarcia@yahoo.es',
    birthday: '1985-11-22',
    tier: 'Gold',
    points: 18.20,
    ltv: 180.50,
    visitCount: 12,
    lastVisitDate: '2026-07-08',
    favoriteDishes: ['Flat White', 'Salmon Bagel'],
    notes: 'Often works from the Terrace on weekdays.',
    joinedDate: '2025-11-15'
  },
  {
    id: 'g-3',
    name: 'John Doe',
    phone: '+34 655 444 333',
    email: 'john.doe@corporate.com',
    birthday: '1988-02-28',
    tier: 'Silver',
    points: 8.50,
    ltv: 95.00,
    visitCount: 6,
    lastVisitDate: '2026-06-15', // Inactive (more than 25-30 days ago, depending on current date 2026-07-12)
    favoriteDishes: ['Espresso', 'Egg Benedict'],
    allergyNotes: 'Gluten (Severe)',
    notes: 'Leaves generous tips, usually orders takeaways.',
    joinedDate: '2026-01-20'
  },
  {
    id: 'g-4',
    name: 'Anna Petrova',
    phone: '+34 699 111 222',
    email: 'anna.p@mail.ru',
    birthday: '1995-07-07',
    tier: 'Bronze',
    points: 3.40,
    ltv: 34.00,
    visitCount: 2,
    lastVisitDate: '2026-07-11',
    favoriteDishes: ['Matcha Latte', 'Lemon Tart'],
    notes: 'Likes quiet corners in the VIP Room.',
    joinedDate: '2026-06-10'
  },
  {
    id: 'g-5',
    name: 'David Smith',
    phone: '+34 633 555 777',
    email: 'david.smith@techcorp.com',
    birthday: '1992-09-05',
    tier: 'VIP',
    points: 52.00,
    ltv: 410.00,
    visitCount: 30,
    lastVisitDate: '2026-07-12',
    favoriteDishes: ['Cold Brew', 'Vegan Burger', 'Acai Bowl'],
    notes: 'Vegan options only.',
    joinedDate: '2025-08-10'
  },
  {
    id: 'g-6',
    name: 'Elena Rodriguez',
    phone: '+34 644 888 999',
    email: 'elena.rod@hotmail.com',
    birthday: '1993-04-03',
    tier: 'Gold',
    points: 22.10,
    ltv: 215.30,
    visitCount: 15,
    lastVisitDate: '2026-07-09',
    favoriteDishes: ['Latte Macchiato', 'Pancakes'],
    allergyNotes: 'Dairy (Lactose intolerant)',
    notes: 'Prefers soy milk or coconut milk.',
    joinedDate: '2025-10-05'
  },
  {
    id: 'g-7',
    name: 'Marc Vila',
    phone: '+34 600 777 888',
    email: 'mvila@barcelona.cat',
    birthday: '1980-12-12',
    tier: 'Bronze',
    points: 1.50,
    ltv: 15.00,
    visitCount: 1,
    lastVisitDate: '2026-05-01', // Inactive
    favoriteDishes: ['Cortado', 'Pan con Tomate'],
    notes: 'Local customer, speaks Catalan.',
    joinedDate: '2026-05-01'
  },
  {
    id: 'g-8',
    name: 'Sophia Mueller',
    phone: '+34 677 222 111',
    email: 'sophia.m@domain.de',
    birthday: '1998-01-19',
    tier: 'Silver',
    points: 9.60,
    ltv: 120.00,
    visitCount: 8,
    lastVisitDate: '2026-07-05',
    favoriteDishes: ['Americano', 'Cinnamon Roll'],
    notes: 'Friendly tourist who decided to stay in BCN.',
    joinedDate: '2026-03-12'
  },
  {
    id: 'g-9',
    name: 'Lucas Martin',
    phone: '+34 688 333 444',
    email: 'lucas.m@gmail.com',
    birthday: '1987-08-30',
    tier: 'Bronze',
    points: 5.80,
    ltv: 58.00,
    visitCount: 4,
    lastVisitDate: '2026-07-11',
    favoriteDishes: ['Iced Latte', 'Club Sandwich'],
    notes: 'Comes during lunch break.',
    joinedDate: '2026-06-25'
  },
  {
    id: 'g-10',
    name: 'Yuki Tanaka',
    phone: '+34 611 222 333',
    email: 'yuki.t@tanaka.co.jp',
    birthday: '1991-03-25',
    tier: 'Gold',
    points: 25.00,
    ltv: 250.00,
    visitCount: 18,
    lastVisitDate: '2026-06-05', // Inactive (more than 30 days ago)
    favoriteDishes: ['Matcha Latte', 'Cheesecake', 'Mocha'],
    notes: 'Big fan of matcha products.',
    joinedDate: '2025-12-01'
  }
];

/** @deprecated Use getGuestsAsync — customers are stored in PostgreSQL. */
export const getGuests = (): Guest[] => [];

/** @deprecated Use saveGuestAsync / updateGuestAsync — no local cache. */
export const saveGuests = (_guests: Guest[]) => {};

export interface LoyaltyConfig {
  bronzeRate: number;
  silverRate: number;
  goldRate: number;
  vipRate: number;
  silverThreshold: number;
  goldThreshold: number;
  vipThreshold: number;
}

export const DEFAULT_LOYALTY_CONFIG: LoyaltyConfig = {
  bronzeRate: 0.05,
  silverRate: 0.08,
  goldRate: 0.10,
  vipRate: 0.15,
  silverThreshold: 75,
  goldThreshold: 150,
  vipThreshold: 300,
};

/** @deprecated Use getLoyaltyConfigAsync — loyalty rules are stored in PostgreSQL. */
export const getLoyaltyConfig = (): LoyaltyConfig => DEFAULT_LOYALTY_CONFIG;

/** @deprecated Use saveLoyaltyConfigAsync — no local cache. */
export const saveLoyaltyConfig = (_config: LoyaltyConfig) => {};

export const getTierCashbackRate = (tier: Guest['tier'], config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG): number => {
  switch (tier) {
    case 'Bronze': return config.bronzeRate;
    case 'Silver': return config.silverRate;
    case 'Gold': return config.goldRate;
    case 'VIP': return config.vipRate;
    default: return config.bronzeRate;
  }
};

export const updateTier = (ltv: number, config: LoyaltyConfig = DEFAULT_LOYALTY_CONFIG): Guest['tier'] => {
  if (ltv >= config.vipThreshold) return 'VIP';
  if (ltv >= config.goldThreshold) return 'Gold';
  if (ltv >= config.silverThreshold) return 'Silver';
  return 'Bronze';
};

/** @deprecated Use applyLoyaltyTransactionAsync — guest data lives in PostgreSQL. */
export const updateGuestPointsAndLTV = (
  _guestId: string,
  _pointsEarned: number,
  _pointsSpent: number,
  _orderTotal: number,
  _currentDate: string = new Date().toISOString().split('T')[0]
) => {
  console.warn('updateGuestPointsAndLTV is deprecated — use applyLoyaltyTransactionAsync');
};

// --- Database Connected Async Operations ---

export function mapCustomerToGuest(c: {
  id: string;
  name: string;
  phone: string;
  email: string;
  birthday?: string | null;
  tier?: string | null;
  points?: number | null;
  ltv?: number | null;
  visitCount?: number | null;
  lastVisitDate?: string | null;
  favoriteDishes?: string[] | null;
  allergyNotes?: string | null;
  notes?: string | null;
  joinedDate?: string | null;
}): Guest {
  const tier = (c.tier as Guest['tier']) || 'Bronze';
  return {
    id: c.id,
    name: c.name,
    phone: c.phone,
    email: c.email,
    birthday: c.birthday || '',
    tier,
    points: c.points ?? 0,
    ltv: c.ltv ?? 0,
    visitCount: c.visitCount ?? 0,
    lastVisitDate: c.lastVisitDate || 'Never',
    favoriteDishes: c.favoriteDishes ?? [],
    allergyNotes: c.allergyNotes || undefined,
    notes: c.notes || undefined,
    joinedDate: c.joinedDate || '',
  };
}

export type GuestsPageResult = {
  items: Guest[];
  total: number;
  page: number;
  limit: number;
};

export async function getGuestsAsync(): Promise<Guest[]> {
  const res = await fetch('/api/crm/customers');
  if (!res.ok) {
    throw new Error('Failed to fetch customers list from PostgreSQL');
  }
  const data = await res.json();
  const items = Array.isArray(data) ? data : data.items;
  return items.map(mapCustomerToGuest);
}

export async function getGuestsPageAsync(options?: {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: CustomerSortField;
  sortOrder?: SortOrder;
}): Promise<GuestsPageResult> {
  const params = new URLSearchParams();
  if (options?.page) params.set('page', String(options.page));
  if (options?.limit) params.set('limit', String(options.limit));
  if (options?.search) params.set('search', options.search);
  if (options?.sortBy) params.set('sortBy', options.sortBy);
  if (options?.sortOrder) params.set('sortOrder', options.sortOrder);

  const qs = params.toString();
  const res = await fetch(`/api/crm/customers${qs ? `?${qs}` : ''}`);
  if (!res.ok) {
    throw new Error('Failed to fetch customers page from PostgreSQL');
  }
  const data = await res.json();
  if (Array.isArray(data)) {
    return { items: data.map(mapCustomerToGuest), total: data.length, page: 1, limit: data.length };
  }
  return {
    items: data.items.map(mapCustomerToGuest),
    total: data.total,
    page: data.page,
    limit: data.limit,
  };
}

export async function saveGuestAsync(data: {
  name: string;
  phone: string;
  email: string;
  birthday?: string;
  allergyNotes?: string;
  notes?: string;
}): Promise<Guest> {
  const res = await fetch('/api/crm/customers', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw await parseCrmError(res);
  }
  const created = await res.json();
  return mapCustomerToGuest(created);
}

export async function updateGuestAsync(
  id: string,
  data: {
    name?: string;
    phone?: string;
    email?: string;
    birthday?: string;
    allergyNotes?: string;
    notes?: string;
    favoriteDishes?: string[];
    tier?: string;
  }
): Promise<Guest> {
  const res = await fetch(`/api/crm/customers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    throw await parseCrmError(res);
  }
  const updated = await res.json();
  return mapCustomerToGuest(updated);
}

export async function adjustGuestPointsAsync(
  id: string,
  pointsDelta: number,
  reason?: string
): Promise<Guest> {
  const res = await fetch(`/api/crm/customers/${id}/points`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pointsDelta, reason }),
  });
  if (!res.ok) {
    throw await parseCrmError(res);
  }
  const updated = await res.json();
  return mapCustomerToGuest(updated);
}

export async function getGuestByQrAsync(code: string): Promise<Guest> {
  const params = new URLSearchParams({ code: code.trim() });
  const res = await fetch(`/api/crm/customers/by-qr?${params.toString()}`);
  if (!res.ok) {
    throw await parseCrmError(res);
  }
  const customer = await res.json();
  return mapCustomerToGuest(customer);
}

export { buildCustomerQrCode, isCustomerQrCode } from './crm-validation';

export async function getLoyaltyConfigAsync(): Promise<LoyaltyConfig> {
  const res = await fetch('/api/crm/loyalty');
  if (!res.ok) {
    throw new Error('Failed to fetch loyalty config from PostgreSQL');
  }
  return res.json();
}

export async function saveLoyaltyConfigAsync(config: Partial<LoyaltyConfig>): Promise<LoyaltyConfig> {
  const res = await fetch('/api/crm/loyalty', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });
  if (!res.ok) {
    throw new Error('Failed to save loyalty configuration in PostgreSQL');
  }
  return res.json();
}

export async function applyLoyaltyTransactionAsync(
  customerId: string,
  amountPaid: number,
  pointsSpent: number,
  orderId?: string
): Promise<Guest> {
  const res = await fetch('/api/crm/loyalty/transaction', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerId, amountPaid, pointsSpent, orderId }),
  });
  if (!res.ok) {
    throw new Error(`Failed to process loyalty points transaction for customer [${customerId}] in PostgreSQL`);
  }
  const updated = await res.json();
  return mapCustomerToGuest(updated);
}

export async function deleteGuestAsync(id: string): Promise<boolean> {
  const res = await fetch(`/api/crm/customers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    throw new Error(`Failed to delete customer profile [${id}] in PostgreSQL`);
  }
  const result = await res.json();
  return result.success;
}


