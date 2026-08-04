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

const INITIAL_GIFT_CARDS: GiftCard[] = [
  {
    id: 'GC-1',
    code: 'CORGI-50-GIFT',
    initialBalance: 50.00,
    balance: 50.00,
    customerId: 'guest-2', // Maria Garcia
    status: 'active',
    createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
    expiryDate: new Date(Date.now() + 335 * 24 * 60 * 60 * 1000).toISOString(), // 1 year expiry
  },
  {
    id: 'GC-2',
    code: 'CORGI-100-VIP',
    initialBalance: 100.00,
    balance: 75.50,
    customerId: 'guest-1', // Alexander Vytvytskyi
    status: 'active',
    createdDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() + 355 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'GC-3',
    code: 'CORGI-25-FREE',
    initialBalance: 25.00,
    balance: 0.00,
    status: 'redeemed',
    createdDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    expiryDate: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
  }
];

export function getGiftCards(): GiftCard[] {
  if (typeof window === 'undefined') return INITIAL_GIFT_CARDS;
  const stored = localStorage.getItem('corgi_gift_cards');
  if (!stored) {
    localStorage.setItem('corgi_gift_cards', JSON.stringify(INITIAL_GIFT_CARDS));
    return INITIAL_GIFT_CARDS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    return INITIAL_GIFT_CARDS;
  }
}

export function saveGiftCards(cards: GiftCard[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('corgi_gift_cards', JSON.stringify(cards));
}

export function createGiftCard(initialBalance: number, customerId?: string): GiftCard {
  const cards = getGiftCards();
  const randomSuffix = Math.floor(1000 + Math.random() * 9000).toString();
  const code = `CORGI-${initialBalance}-${randomSuffix}`;
  
  const newCard: GiftCard = {
    id: `GC-${Date.now()}`,
    code,
    initialBalance,
    balance: initialBalance,
    customerId,
    status: 'active',
    createdDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(), // 1 year from now
  };

  const updated = [newCard, ...cards];
  saveGiftCards(updated);
  return newCard;
}

export function redeemGiftCard(code: string, amount: number): { success: boolean; error?: string; remainingBalance?: number } {
  const cards = getGiftCards();
  const cardIdx = cards.findIndex(c => c.code.trim().toUpperCase() === code.trim().toUpperCase());
  
  if (cardIdx === -1) {
    return { success: false, error: 'Gift Card not found.' };
  }

  const card = cards[cardIdx];
  if (card.status !== 'active') {
    return { success: false, error: `Gift Card is ${card.status}.` };
  }

  if (new Date(card.expiryDate).getTime() < Date.now()) {
    card.status = 'expired';
    saveGiftCards(cards);
    return { success: false, error: 'Gift Card has expired.' };
  }

  if (card.balance < amount) {
    return { success: false, error: `Insufficient balance (Available: €${card.balance.toFixed(2)})` };
  }

  card.balance = parseFloat((card.balance - amount).toFixed(2));
  if (card.balance === 0) {
    card.status = 'redeemed';
  }

  saveGiftCards(cards);
  return { success: true, remainingBalance: card.balance };
}

// --- Database Connected Async Operations ---

export async function getGiftCardsAsync(): Promise<GiftCard[]> {
  const res = await fetch('/api/giftcards');
  if (!res.ok) {
    throw new Error('Failed to fetch gift cards from PostgreSQL');
  }
  return res.json();
}

export async function findCardByCodeAsync(code: string): Promise<GiftCard> {
  const res = await fetch(`/api/giftcards?code=${encodeURIComponent(code)}`);
  if (!res.ok) {
    throw new Error(`Failed to find gift card by code [${code}] in PostgreSQL`);
  }
  return res.json();
}

export async function createGiftCardAsync(initialBalance: number, customerId?: string): Promise<GiftCard> {
  const res = await fetch('/api/giftcards', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initialBalance, customerId }),
  });
  if (!res.ok) {
    throw new Error('Failed to create gift card in PostgreSQL');
  }
  return res.json();
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
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

