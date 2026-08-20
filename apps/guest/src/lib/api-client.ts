import type {
  GuestBootstrapResponse,
  GuestMenuResponse,
  GuestMerchItem,
  GuestOrderSummary,
  GuestCustomerProfile,
  GuestLoyaltyResponse,
  GuestLocale,
  GuestCartModifier,
  GuestLoyaltyTransaction,
} from '@corgi/contracts';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function guestFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export function getBootstrap(locationId: string, table?: string, locale?: GuestLocale) {
  const params = new URLSearchParams({ locationId });
  if (table) params.set('table', table);
  if (locale) params.set('locale', locale);
  return guestFetch<GuestBootstrapResponse>(`/api/guest/bootstrap?${params}`);
}

export function getMenu(locationId: string, locale: GuestLocale) {
  const params = new URLSearchParams({ locationId, locale });
  return guestFetch<GuestMenuResponse>(`/api/guest/menu?${params}`);
}

export function getMerch(locationId: string) {
  return guestFetch<{ items: GuestMerchItem[] }>(`/api/guest/merch?${locationId}`);
}

export function getMerchCatalog(locationId: string) {
  const params = new URLSearchParams({ locationId });
  return guestFetch<{ items: GuestMerchItem[] }>(`/api/guest/merch?${params}`);
}

export interface CartLine {
  key: string;
  menuItemId?: string;
  merchSkuId?: string;
  itemType: 'food' | 'merch';
  name: string;
  unitPrice: number;
  quantity: number;
  comments?: string;
  modifiers?: GuestCartModifier[];
  image?: string;
}

export function createOrder(payload: {
  locationId: string;
  tableId?: string;
  items: CartLine[];
  tipType?: 'percent' | 'fixed';
  tipValue?: number;
  customerId?: string;
}) {
  return guestFetch<GuestOrderSummary>('/api/guest/orders', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      items: payload.items.map((i) => ({
        menuItemId: i.menuItemId,
        merchSkuId: i.merchSkuId,
        itemType: i.itemType,
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        comments: i.comments,
        modifiers: i.modifiers,
      })),
    }),
  });
}

export function createMerchOrder(payload: {
  locationId: string;
  items: CartLine[];
}) {
  return guestFetch<GuestOrderSummary>('/api/guest/merch/orders', {
    method: 'POST',
    body: JSON.stringify({
      locationId: payload.locationId,
      items: payload.items.map((i) => ({
        merchSkuId: i.merchSkuId,
        itemType: 'merch',
        name: i.name,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
      })),
    }),
  });
}

export function getOrders() {
  return guestFetch<{ orders: GuestOrderSummary[] }>('/api/guest/orders');
}

export function getOrder(id: string) {
  return guestFetch<GuestOrderSummary>(`/api/guest/orders/${id}`);
}

export function getProfile() {
  return guestFetch<GuestCustomerProfile>('/api/guest/me');
}

export function getLoyalty() {
  return guestFetch<GuestLoyaltyResponse>('/api/guest/me/loyalty');
}

export function requestOtp(phone: string) {
  return guestFetch<{ sent: boolean; devCode?: string }>('/api/guest/auth/otp/request', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });
}

export function verifyOtp(phone: string, code: string) {
  return guestFetch<{ ok: boolean }>('/api/guest/auth/otp/verify', {
    method: 'POST',
    body: JSON.stringify({ phone, code }),
  });
}

export function registerGuest(data: {
  phone: string;
  code: string;
  name: string;
  email: string;
  allergyNotes?: string;
}) {
  return guestFetch<{ ok: boolean }>('/api/guest/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function logoutGuest() {
  return guestFetch<{ ok: boolean }>('/api/guest/auth/logout', { method: 'POST' });
}

export function updateProfile(data: { name?: string; email?: string; allergyNotes?: string }) {
  return guestFetch<GuestCustomerProfile>('/api/guest/me', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export function getLoyaltyTransactions() {
  return guestFetch<GuestLoyaltyTransaction[]>('/api/guest/me/loyalty/transactions');
}
