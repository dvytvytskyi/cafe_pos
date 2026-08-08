export interface GiftCard {
  id: string;
  code: string;
  initialBalance: number;
  balance: number;
  customerId?: string;
  status: 'active' | 'redeemed' | 'expired' | 'disabled';
  createdDate: string;
  expiryDate: string;
}

export class GiftCardApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'GiftCardApiError';
    this.status = status;
  }
}

export function mapApiGiftCardToUi(row: {
  id: string;
  code: string;
  initialBalance: number;
  balance: number;
  customerId?: string | null;
  status: string;
  createdAt?: string | Date;
  createdDate?: string;
  expiryDate: string | Date;
}): GiftCard {
  const created =
    row.createdDate ??
    (row.createdAt instanceof Date ? row.createdAt.toISOString() : row.createdAt) ??
    new Date().toISOString();
  const expiry =
    row.expiryDate instanceof Date ? row.expiryDate.toISOString() : row.expiryDate;

  return {
    id: row.id,
    code: row.code,
    initialBalance: row.initialBalance,
    balance: row.balance,
    customerId: row.customerId ?? undefined,
    status: row.status as GiftCard['status'],
    createdDate: created,
    expiryDate: expiry,
  };
}

export async function getGiftCardsAsync(): Promise<GiftCard[]> {
  const res = await fetch('/api/giftcards');
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new GiftCardApiError(body.error ?? 'Failed to fetch gift cards', res.status);
  }
  const data = await res.json();
  return Array.isArray(data) ? data.map(mapApiGiftCardToUi) : [];
}

export async function findCardByCodeAsync(code: string): Promise<GiftCard> {
  const res = await fetch(`/api/giftcards?code=${encodeURIComponent(code)}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new GiftCardApiError(body.error ?? `Gift card not found: ${code}`, res.status);
  }
  return mapApiGiftCardToUi(await res.json());
}

export async function createGiftCardAsync(initialBalance: number, customerId?: string): Promise<GiftCard> {
  const res = await fetch('/api/giftcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initialBalance, customerId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GiftCardApiError(body.error ?? 'Failed to create gift card', res.status);
  }
  return mapApiGiftCardToUi(body);
}

export async function createGiftCardsBatchAsync(
  count: number,
  initialBalance: number,
  customerId?: string
): Promise<GiftCard[]> {
  const res = await fetch('/api/giftcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ count, initialBalance, customerId }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GiftCardApiError(body.error ?? 'Failed to create gift cards', res.status);
  }
  return Array.isArray(body) ? body.map(mapApiGiftCardToUi) : [];
}

export async function setGiftCardStatusAsync(
  id: string,
  status: 'active' | 'disabled'
): Promise<GiftCard> {
  const res = await fetch(`/api/giftcards/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new GiftCardApiError(body.error ?? 'Failed to update gift card status', res.status);
  }
  return mapApiGiftCardToUi(body);
}

export async function redeemGiftCardAsync(
  code: string,
  amount: number
): Promise<{ success: boolean; error?: string; remainingBalance?: number }> {
  try {
    const res = await fetch('/api/giftcards/redeem', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, amount }),
    });
    return res.json();
  } catch (error: unknown) {
    return { success: false, error: error instanceof Error ? error.message : 'Redemption failed' };
  }
}
